String.prototype.isTrue = function () {
  return ['true', '1', 'yes'].includes(this.toLowerCase());
};
