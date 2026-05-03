const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');

const logActivity = async (projectId, userId, action, targetType, targetName, details) => {
  try {
    await Activity.create({ project: projectId, user: userId, action, targetType, targetName, details });
  } catch (err) { console.error('Activity log error:', err.message); }
};

exports.createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { title, description, project, assignee, priority, dueDate, tags } = req.body;
    const projectDoc = await Project.findById(project);
    if (!projectDoc) return res.status(404).json({ success: false, message: 'Project not found' });

    const isMember = projectDoc.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You must be a member of this project to create tasks' });
    }

    if (assignee) {
      const assigneeIsMember = projectDoc.members.some(m => m.user.toString() === assignee);
      if (!assigneeIsMember) {
        return res.status(400).json({ success: false, message: 'Assignee must be a member of this project' });
      }
    }

    const task = await Task.create({
      title, description, project,
      assignee: assignee || null, creator: req.user._id,
      priority: priority || 'medium', dueDate: dueDate || null, tags: tags || []
    });
    await task.populate('assignee', 'name email avatar');
    await task.populate('creator', 'name email avatar');
    await task.populate('project', 'name color');
    await logActivity(project, req.user._id, 'task_created', 'task', title, 'Created a new task');
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { project, assignee, status, priority, search } = req.query;
    let filter = {};

    let userProjects;
    if (req.user.role === 'admin') {
      userProjects = await Project.find().select('_id');
    } else {
      userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
    }
    const userProjectIds = userProjects.map(p => p._id);

    if (project) {
      if (!userProjectIds.some(pid => pid.toString() === project)) {
        return res.status(403).json({ success: false, message: 'Not authorized for this project' });
      }
      filter.project = project;
    } else {
      filter.project = { $in: userProjectIds };
    }

    if (assignee) filter.assignee = assignee;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('project', 'name color')
      .sort('-createdAt');
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('project', 'name color');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const projectDoc = await Project.findById(task.project._id || task.project);
    if (projectDoc) {
      const isMember = projectDoc.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
      }
    }
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const projectDoc = await Project.findById(task.project);
    if (projectDoc) {
      const memberEntry = projectDoc.members.find(m => m.user.toString() === req.user._id.toString());
      const isMember = !!memberEntry;
      const isProjAdmin = memberEntry && memberEntry.role === 'admin';
      const isGlobalAdmin = req.user.role === 'admin';
      const isOwner = projectDoc.owner.toString() === req.user._id.toString();

      if (!isMember && !isGlobalAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }

      if (!isProjAdmin && !isGlobalAdmin && !isOwner) {
        const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
        const isCreator = task.creator.toString() === req.user._id.toString();
        const onlyStatusChange = Object.keys(req.body).length === 1 && req.body.status;

        if (!isAssignee && !isCreator) {
          return res.status(403).json({ success: false, message: 'Members can only update tasks assigned to them or created by them' });
        }
        if (!onlyStatusChange && !isCreator) {
          return res.status(403).json({ success: false, message: 'Members can only change the status of assigned tasks' });
        }
      }
    }

    const { title, description, status, priority, assignee, dueDate, tags } = req.body;

    if (assignee !== undefined && assignee && projectDoc) {
      const assigneeIsMember = projectDoc.members.some(m => m.user.toString() === assignee);
      if (!assigneeIsMember) {
        return res.status(400).json({ success: false, message: 'Assignee must be a member of this project' });
      }
    }

    const oldStatus = task.status;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (tags !== undefined) task.tags = tags;

    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('creator', 'name email avatar');
    await task.populate('project', 'name color');

    if (status && status !== oldStatus) {
      await logActivity(task.project._id || task.project, req.user._id, 'task_status_changed', 'task', task.title, `${oldStatus} → ${status}`);
    } else {
      await logActivity(task.project._id || task.project, req.user._id, 'task_updated', 'task', task.title, 'Updated task');
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isCreator = task.creator.toString() === req.user._id.toString();
    const project = await Project.findById(task.project);
    const isProjectOwner = project && project.owner.toString() === req.user._id.toString();
    const isProjAdmin = project && project.members.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    const isGlobalAdmin = req.user.role === 'admin';

    if (!isCreator && !isProjectOwner && !isProjAdmin && !isGlobalAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    const taskTitle = task.title;
    const projectId = task.project;
    await Comment.deleteMany({ task: task._id });
    await Task.findByIdAndDelete(task._id);
    await logActivity(projectId, req.user._id, 'task_deleted', 'task', taskTitle, 'Deleted task');
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    let userProjects;
    if (req.user.role === 'admin') {
      userProjects = await Project.find().select('_id');
    } else {
      userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
    }
    const projectFilter = { project: { $in: userProjects.map(p => p._id) } };

    const [totalTasks, todoTasks, inProgressTasks, reviewTasks, doneTasks] = await Promise.all([
      Task.countDocuments(projectFilter),
      Task.countDocuments({ ...projectFilter, status: 'todo' }),
      Task.countDocuments({ ...projectFilter, status: 'in-progress' }),
      Task.countDocuments({ ...projectFilter, status: 'review' }),
      Task.countDocuments({ ...projectFilter, status: 'done' })
    ]);

    const [overdueTasks, recentTasks, myTasks] = await Promise.all([
      Task.find({ ...projectFilter, dueDate: { $lt: new Date() }, status: { $ne: 'done' } })
        .populate('assignee', 'name email avatar').populate('project', 'name color')
        .sort('dueDate').limit(10),
      Task.find(projectFilter).populate('assignee', 'name email avatar')
        .populate('project', 'name color').sort('-createdAt').limit(5),
      Task.find({ ...projectFilter, assignee: req.user._id, status: { $ne: 'done' } })
        .populate('project', 'name color').sort('-createdAt')
    ]);

    const [low, medium, high, critical] = await Promise.all([
      Task.countDocuments({ ...projectFilter, priority: 'low' }),
      Task.countDocuments({ ...projectFilter, priority: 'medium' }),
      Task.countDocuments({ ...projectFilter, priority: 'high' }),
      Task.countDocuments({ ...projectFilter, priority: 'critical' })
    ]);

    const recentActivity = await Activity.find({ project: { $in: userProjects.map(p => p._id) } })
      .populate('user', 'name email avatar').sort('-createdAt').limit(10);

    res.json({
      success: true,
      stats: {
        totalTasks, todoTasks, inProgressTasks, reviewTasks, doneTasks,
        overdueTasks, recentTasks, myTasks,
        projectCount: userProjects.length,
        priorityStats: { low, medium, high, critical },
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await Project.findById(task.project);
    if (project) {
      const isMember = project.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    const comment = await Comment.create({ task: task._id, author: req.user._id, text: text.trim() });
    await comment.populate('author', 'name email avatar');
    await logActivity(task.project, req.user._id, 'comment_added', 'comment', task.title, text.trim().slice(0, 100));
    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.id })
      .populate('author', 'name email avatar')
      .sort('-createdAt');
    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    const isAuthor = comment.author.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }
    await Comment.findByIdAndDelete(comment._id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
