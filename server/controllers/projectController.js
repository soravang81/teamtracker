const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

const logActivity = async (projectId, userId, action, targetType, targetName, details) => {
  try {
    await Activity.create({ project: projectId, user: userId, action, targetType, targetName, details });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

exports.createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admins can create projects' });

    const { name, description, color } = req.body;
    const project = await Project.create({
      name, description, color, owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');
    await logActivity(project._id, req.user._id, 'project_created', 'project', name, 'Created the project');
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = Project.find();
    } else {
      query = Project.find({ 'members.user': req.user._id });
    }
    const projects = await query
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role')
      .populate('taskCount')
      .sort('-createdAt');
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this project' });
    }
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isProjAdmin = project.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');
    if (!isOwner && !isProjAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only project admins can update this project' });
    }

    const { name, description, status, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (color) project.color = color;
    await project.save();
    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');
    await logActivity(project._id, req.user._id, 'project_updated', 'project', project.name, 'Updated project settings');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the project owner or global admin can delete this project' });
    }
    await Task.deleteMany({ project: project._id });
    await Activity.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(project._id);
    res.json({ success: true, message: 'Project and associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isProjAdmin = project.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');
    if (!isOwner && !isProjAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only project admins can manage members' });
    }
    if (project.members.some(m => m.user.toString() === userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    const User = require('../models/User');
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    project.members.push({ user: userId, role: role || 'member' });
    await project.save();
    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');
    await logActivity(project._id, req.user._id, 'member_added', 'member', targetUser.name, `Added as ${role || 'member'}`);
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isProjAdmin = project.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');
    if (!isOwner && !isProjAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only project admins can manage members' });
    }
    if (userId === project.owner.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }

    project.members = project.members.filter(m => m.user.toString() !== userId);
    await project.save();
    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');
    await logActivity(project._id, req.user._id, 'member_removed', 'member', '', 'Removed from project');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.changeMemberRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'userId and valid role required' });
    }
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the project owner or global admin can change roles' });
    }

    const entry = project.members.find(m => m.user.toString() === userId);
    if (!entry) return res.status(404).json({ success: false, message: 'User is not a member' });

    entry.role = role;
    await project.save();
    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');
    await logActivity(project._id, req.user._id, 'member_role_changed', 'member', '', `Role changed to ${role}`);
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProjectActivity = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const isMember = project.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const activities = await Activity.find({ project: req.params.id })
      .populate('user', 'name email avatar')
      .sort('-createdAt').limit(50);
    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
