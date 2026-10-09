const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    slNo: { type: String, default: null },
    districtName: { type: String, default: null },
    districtCode: { type: String, index: true, default: null },
    blockName: { type: String, default: null },
    blockCode: { type: String, index: true, default: null },
    schoolName: { type: String, index: true, default: null },
    udiseCode: { type: String, required: true, unique: true, index: true },
    isNv: { type: Boolean, default: null },
    clusterCode: { type: String, index: true, default: null },
    clusterName: { type: String, default: null },
    school_type: { type: String, default: null },
    address: { type: String, default: null },
    management: { type: String, default: null },
    category: { type: String, default: null },
    classFrom: { type: String, default: null },
    classTo: { type: String, default: null }
  },
  {
    timestamps: true
  }
);


const School = mongoose.model('schools', schoolSchema);

module.exports = School;