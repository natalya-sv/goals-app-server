const GoalCategory = Object.freeze({
  PERSONAL_DEVELOPMENT: 0,
  EDUCATION: 1,
  HOBBY: 2,
  BUSINESS: 3,
  HEALTH: 4,
});

const getCategory = (category) => {
  const index = Object.values(GoalCategory).indexOf(category);
  const value = Object.keys(GoalCategory)[index];

  return value;
};
module.exports = { GoalCategory, getCategory };
