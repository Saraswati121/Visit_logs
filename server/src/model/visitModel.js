const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    udiseCode: { type: String, required: true, index: true },
    visitedAt: { type: Date, required: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },
    districtCode: { type: String, required: true, index: true },
    blockCode: { type: String, required: true, index: true },
    clusterCode: { type: String, default: null },
    answers: { type: [answerSchema], required: true }
  },
  {
    timestamps: true
  }
);

const Visit = mongoose.model('visits', visitSchema);

module.exports = Visit;
