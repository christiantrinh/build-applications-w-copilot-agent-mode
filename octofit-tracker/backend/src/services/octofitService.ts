import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function validationError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeObjectId(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw validationError(`Invalid ${fieldName}`, 400);
  }
  return new mongoose.Types.ObjectId(value);
}

function toPositiveMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw validationError('Minutes must be a positive number', 400);
  }
  return minutes;
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw validationError('Activity payload is required', 400);
  }

  const { userId, teamId, type, minutes } = input as { userId?: unknown; teamId?: unknown; type?: unknown; minutes?: unknown };
  const userObjectId = normalizeObjectId(userId, 'userId');
  const teamObjectId = normalizeObjectId(teamId, 'teamId');

  const normalizedType = typeof type === 'string' ? type.trim() : '';
  if (!normalizedType) {
    throw validationError('Activity type is required', 400);
  }

  const numericMinutes = toPositiveMinutes(minutes);
  const [user, team] = await Promise.all([User.findById(userObjectId), Team.findById(teamObjectId)]);

  if (!user) {
    throw validationError('User not found', 404);
  }
  if (!team) {
    throw validationError('Team not found', 404);
  }

  const activity = await Activity.create({
    user: userObjectId,
    team: teamObjectId,
    type: normalizedType,
    minutes: numericMinutes,
    points: Math.max(1, Math.round(numericMinutes)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw validationError('Team payload is required', 400);
  }

  const { name, mascot, members } = input as { name?: unknown; mascot?: unknown; members?: unknown };
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedMascot = typeof mascot === 'string' ? mascot.trim() : '';

  if (!trimmedName) {
    throw validationError('Team name is required', 400);
  }
  if (!trimmedMascot) {
    throw validationError('Team mascot is required', 400);
  }

  const memberIds = Array.isArray(members)
    ? members.map((member) => {
        if (typeof member !== 'string' || !mongoose.Types.ObjectId.isValid(member)) {
          throw validationError('Team members must be valid user ids', 400);
        }
        return new mongoose.Types.ObjectId(member);
      })
    : [];

  const uniqueMemberIds = new Set(memberIds.map((memberId) => memberId.toString()));
  if (uniqueMemberIds.size > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: [...uniqueMemberIds] } });
    if (existingMembers !== uniqueMemberIds.size) {
      throw validationError('Team member not found', 404);
    }
  }

  const team = await Team.create({
    name: trimmedName,
    mascot: trimmedMascot,
    members: memberIds,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (totals.length === 0) {
    return [];
  }

  const teams = await Team.find({ _id: { $in: totals.map((entry) => entry._id) } }).lean();
  const teamMap = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.map((entry, index) => ({
    teamName: teamMap.get(entry._id.toString()) ?? 'Unknown team',
    totalPoints: Number(entry.totalPoints),
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail?.trim();
  if (!normalizedEmail) {
    throw validationError('User email is required', 400);
  }

  const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
  if (!user) {
    throw validationError('User not found', 404);
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const requestedFocus = typeof user.fitnessGoal === 'string' && user.fitnessGoal.trim() ? user.fitnessGoal.trim().toLowerCase() : recentActivity?.type?.toLowerCase() ?? 'endurance';
  const focusMap: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'mobility',
    strength: 'strength',
    swim: 'cardio',
  };
  const preferredFocus = focusMap[requestedFocus] ?? requestedFocus;

  const workouts = await Workout.find().sort({ title: 1 }).lean();
  const preferred = workouts.filter((workout) => workout.focus?.toLowerCase() === preferredFocus);
  const fallback = workouts.filter((workout) => !preferred.some((item) => item._id.toString() === workout._id.toString()));
  const ordered = [...preferred, ...fallback];

  if (!ordered.length) {
    return [];
  }

  const reasonSource = recentActivity?.type ?? user.fitnessGoal ?? 'recent activity';
  return ordered.map((workout) => ({
    ...workout,
    reason: `Based on your ${reasonSource} activity, this ${workout.focus} workout matches your current goal and helps maintain momentum.`,
  }));
}

export { User };
