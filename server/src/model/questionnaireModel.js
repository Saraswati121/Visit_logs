const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    min: { type: Number },
    max: { type: Number },
    options: [{ type: String }],
    maxLength: { type: Number },
    optional: { type: Boolean, default: false }
  },
  { _id: false }
);

const questionnaireSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    title: { type: String, required: true },
    questions: [questionSchema]
  },
  {
    timestamps: true
  }
);

const Questionnaire = mongoose.model('questionnaires', questionnaireSchema);

module.exports = Questionnaire;
