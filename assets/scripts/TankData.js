var _tankType = cc.Enum({
    normal: 1,
    speed: 2,
    big: 3
});
var _playerType = {
    self: 1,
    friend: 2,
    enemy: 3
};

module.exports = {
    tankType: _tankType,
    playerType: _playerType
};