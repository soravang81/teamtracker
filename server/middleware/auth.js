const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

const isProjectAdmin = async (req, res, next) => {
  const Project = require('../models/Project');
  const projectId = req.params.id || req.params.projectId || req.body.project;

  if (!projectId) {
    return next();
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const memberEntry = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );
    const isMemberAdmin = memberEntry && memberEntry.role === 'admin';
    const isGlobalAdmin = req.user.role === 'admin';

    req.isProjectAdmin = isOwner || isMemberAdmin || isGlobalAdmin;
    req.project = project;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error checking permissions' });
  }
};

module.exports = { protect, authorize, isProjectAdmin };
