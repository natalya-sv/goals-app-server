const GoalCategory = Object.freeze({
  PERSONAL_DEVELOPMENT: "Personal Development",
  EDUCATION: "Education",
  HOBBY: "Hobby",
  BUSINESS: "Business",
  HEALTH: "Health",
  SPORT: "Sport",
});

const getCategory = (category) => {
  const index = Object.values(GoalCategory).indexOf(category);
  const value = Object.keys(GoalCategory)[index];

  return value;
};
module.exports = { GoalCategory, getCategory };
