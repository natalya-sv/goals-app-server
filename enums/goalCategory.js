const GoalCategory = Object.freeze({
  PERSONAL_DEVELOPMENT: "PERSONAL_DEVELOPMENT",
  EDUCATION: "EDUCATION",
  HOBBY: "HOBBY",
  BUSINESS: "BUSINESS",
  HEALTH: "HEALTH",
});

const getCategory = (category) => {
  const index = Object.values(GoalCategory).indexOf(category);
  const value = Object.keys(GoalCategory)[index];

  return value;
};
module.exports = { GoalCategory, getCategory };
