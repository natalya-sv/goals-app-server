const GoalStatus = Object.freeze({
  NOT_STARTED: 0,
  STARTED: 1,
  IN_PROGRESS: 2,
  PAUSED: 3,
  ACCOMPLISHED: 4,
  ABORTED: 5,
});

const getStatus = (status) => {
  const index = Object.values(GoalStatus).indexOf(status);
  const value = Object.keys(GoalStatus)[index];

  return value;
};
module.exports = { GoalStatus, getStatus };
