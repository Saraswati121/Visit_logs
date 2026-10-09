const express = require('express');
const router = express.Router();
const School = require('../model/schoolModel');
const Questionnaire = require('../model/questionnaireModel');
const Visit = require('../model/visitModel');

const getISTDate = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

router.get('/schools', async (req, res) => {
  try {
    const { districtCode, blockCode, clusterCode, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (districtCode) filter.districtCode = districtCode;
    if (blockCode) filter.blockCode = blockCode;
    if (clusterCode) filter.clusterCode = clusterCode;

    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: 'i' } },
        { udiseCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, schools] = await Promise.all([
      School.countDocuments(filter),
      School.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);
    return res.json({ page: Number(page), limit: Number(limit), total, schools });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/districts', async (req, res) => {
  try {
    const districts = await School.aggregate([
      { $match: { districtCode: { $ne: null } } },
      { $group: { _id: '$districtCode', districtName: { $first: '$districtName' } } },
      { $sort: { districtName: 1 } },
      { $project: { districtCode: '$_id', districtName: 1, _id: 0 } }
    ]);
    return res.json(districts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/blocks', async (req, res) => {
  try {
    const { districtCode } = req.query;
    const match = { blockCode: { $ne: null } };
    if (districtCode) match.districtCode = districtCode;
    const blocks = await School.aggregate([
      { $match: match },
      { $group: { _id: '$blockCode', blockName: { $first: '$blockName' }, districtCode: { $first: '$districtCode' } } },
      { $sort: { blockName: 1 } },
      { $project: { blockCode: '$_id', blockName: 1, districtCode: 1, _id: 0 } }
    ]);
    return res.json(blocks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


router.get('/questionnaires/current', async (req, res) => {
  try {
    const istNow = getISTDate();
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth() + 1;

    const questionnaire = await Questionnaire.findOne({ year, month }).lean();
    if (!questionnaire) {
      return res.status(404).json({ message: `No questionnaire found for ${month}/${year}` });
    }

    return res.json(questionnaire);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/visits', async (req, res) => {
  try {
    const { clientId, userId, udiseCode, visitedAt, answers } = req.body;

    if (!clientId || !userId || !udiseCode) {
      return res.status(400).json({ message: 'Missing required visit fields (clientId, userId, udiseCode)' });
    }

    const existing = await Visit.findOne({ clientId }).lean();
    if (existing) {
      return res.status(200).json(existing);
    }
    const school = await School.findOne({ udiseCode }).lean();
    const visitDate = visitedAt ? new Date(visitedAt) : new Date();

    const visit = await Visit.create({
      clientId,
      userId,
      udiseCode,
      visitedAt: visitDate,
      year: visitDate.getFullYear(),
      month: visitDate.getMonth() + 1,
      districtCode: school ? school.districtCode : req.body.districtCode,
      blockCode: school ? school.blockCode : req.body.blockCode,
      clusterCode: school ? school.clusterCode : req.body.clusterCode,
      answers: answers || []
    });

    return res.status(201).json(visit);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/visits', async (req, res) => {
  try {
    const { userId, month, year, page = 1, limit = 20 } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId query parameter is required' });
    }

    const filter = { userId };
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const skip = (Number(page) - 1) * Number(limit);

    const [total, visits] = await Promise.all([
      Visit.countDocuments(filter),
      Visit.aggregate([
        { $match: filter },
        { $sort: { visitedAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: 'schools',
            localField: 'udiseCode',
            foreignField: 'udiseCode',
            as: 'school'
          }
        },
        { $project: { school: 0, __v: 0 } }
      ])
    ]);

    return res.json({ page: Number(page), limit: Number(limit), total, visits });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/reports/block-summary', async (req, res) => {
  try {
    const { districtCode, month, year } = req.query;
    if (!districtCode || !month || !year) {
      return res.status(400).json({ message: 'districtCode, month, and year are required' });
    }

    const [schools, visits] = await Promise.all([
      School.find({ districtCode }).lean(),
      Visit.find({
        districtCode,
        month: Number(month),
        year: Number(year)
      }).lean()
    ]);


    const visitsBySchool = new Map();
    for (const v of visits) {
      if (!visitsBySchool.has(v.udiseCode)) {
        visitsBySchool.set(v.udiseCode, []);
      }
      visitsBySchool.get(v.udiseCode).push(v);
    }

    const blockMap = new Map();
    for (const school of schools) {
      const code = school.blockCode || 'UNKNOWN';
      if (!blockMap.has(code)) {
        blockMap.set(code, {
          blockCode: code,
          blockName: school.blockName || code,
          schools: []
        });
      }
      blockMap.get(code).schools.push(school);
    }


    const rows = [];
    const districtVisitedSchools = new Set();
    const districtVisitors = new Set();
    let districtTotalVisits = 0;

    for (const block of blockMap.values()) {
      const visitedSchools = new Set();
      const visitors = new Set();
      let blockVisitsCount = 0;

      for (const s of block.schools) {
        const schoolVisits = visitsBySchool.get(s.udiseCode) || [];
        if (schoolVisits.length > 0) {
          visitedSchools.add(s.udiseCode);
          districtVisitedSchools.add(s.udiseCode);
        }
        for (const v of schoolVisits) {
          visitors.add(v.userId);
          districtVisitors.add(v.userId);
          blockVisitsCount++;
          districtTotalVisits++;
        }
      }

      const totalSchools = block.schools.length;
      const schoolsVisited = visitedSchools.size;
      const coveragePercent = totalSchools > 0
        ? Math.round((schoolsVisited / totalSchools) * 1000) / 10
        : 0;

      rows.push({
        blockCode: block.blockCode,
        blockName: block.blockName,
        totalSchools,
        schoolsVisited,
        uniqueVisitors: visitors.size,
        visits: blockVisitsCount,
        coveragePercent
      });
    }

    rows.sort((a, b) => a.blockName.localeCompare(b.blockName));

    const totalDistrictSchools = schools.length;
    const districtSchoolsVisited = districtVisitedSchools.size;
    const districtCoverage = totalDistrictSchools > 0
      ? Math.round((districtSchoolsVisited / totalDistrictSchools) * 1000) / 10
      : 0;

    const districtTotal = {
      totalSchools: totalDistrictSchools,
      schoolsVisited: districtSchoolsVisited,
      uniqueVisitors: districtVisitors.size,
      visits: districtTotalVisits,
      coveragePercent: districtCoverage
    };

    return res.json({ rows, districtTotal });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;