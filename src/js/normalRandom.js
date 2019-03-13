const normalRandom = (m = 0, s = 1) => {
  const r =
    (Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() -
      3) /
    3;
  return r * s + m;
};

export default normalRandom;
