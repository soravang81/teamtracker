const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'task_created', 'task_updated', 'task_deleted', 'task_status_changed',
      'task_assigned', 'comment_added',
      'member_added', 'member_removed', 'member_role_changed',
      'project_created', 'project_updated'
    ]
  },
  targetType: {
    type: String,
    enum: ['task', 'project', 'member', 'comment'],
    default: 'task'
  },
  targetName: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

activitySchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
