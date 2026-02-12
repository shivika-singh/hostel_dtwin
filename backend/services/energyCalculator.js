module.exports = function calculatePower(light, fan) {
  const LIGHT_POWER = 40;
  const FAN_POWER = 70;

  return (light ? LIGHT_POWER : 0) + (fan ? FAN_POWER : 0);
};
