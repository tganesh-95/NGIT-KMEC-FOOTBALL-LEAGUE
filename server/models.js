import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({ teamId: { type: String, unique: true }, name: String, institution: String, year: String }, { timestamps: true });
const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, unique: true }, team1: String, team2: String, date: String, time: String, venue: String,
  team1Score: { type: Number, default: null, min: 0 }, team2Score: { type: Number, default: null, min: 0 },
  resultEnteredAt: { type: Date, default: null },
  status: { type: String, enum: ['Scheduled', 'Upcoming', 'Live', 'Completed', 'Postponed'], default: 'Scheduled' }
}, { timestamps: true });
export const Team = mongoose.model('Team', teamSchema);
export const Match = mongoose.model('Match', matchSchema);
