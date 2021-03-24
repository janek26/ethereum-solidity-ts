// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Context.sol';
import 'hardhat/console.sol';

contract InfraGuardianVault is Context {
  struct WardDetails {
    uint256 timelockPeriod;
    uint256 requiredBond;
    uint256 guardiansLength;
    mapping(address => uint256) guardians;
    mapping(address => uint256) trustedModules;
  }

  mapping(address => WardDetails) public wards;

  event GuardianAdded(address ward, address guardian);
  event GuardianRemoved(address ward, address guardian);

  function _now() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }

  function _isValidIn(
    mapping(address => uint256) storage _addresses,
    address _suspect,
    uint256 _timelockPeriod,
    uint256 _timestampNow
  ) internal view returns (bool) {
    uint256 _guardianCreateTime = _addresses[_suspect];
    if (_guardianCreateTime == 0) {
      return false;
    }
    if (_timestampNow > (_guardianCreateTime + _timelockPeriod)) {
      return true;
    }
    return false;
  }

  function _isGuardian(
    address _wardAddress,
    address _suspect,
    uint256 _timestampNow
  ) private view returns (bool) {
    WardDetails storage _ward = _getWardUnsafe(_wardAddress);
    return
      _isValidIn(
        _ward.guardians,
        _suspect,
        _ward.timelockPeriod,
        _timestampNow
      );
  }

  function _isListedAsGuardian(address _wardAddress, address _suspect)
    private
    view
    returns (bool)
  {
    return _isGuardian(_wardAddress, _suspect, uint256(-1)); // ignore timestamp
  }

  function _isTrusted(
    address _wardAddress,
    address _suspect,
    uint256 _timestampNow
  ) private view returns (bool) {
    if (_wardAddress == _suspect) return true; // always trust yourself
    WardDetails storage _ward = _getWardUnsafe(_wardAddress);
    return
      _isValidIn(
        _ward.trustedModules,
        _suspect,
        _ward.timelockPeriod,
        _timestampNow
      );
  }

  function _checkWardExists(WardDetails storage _ward)
    private
    view
    returns (bool)
  {
    return _ward.guardiansLength > 0;
  }

  function _getWardUnsafe(address _suspect)
    private
    view
    returns (WardDetails storage)
  {
    return wards[_suspect];
  }

  function _getWard(address _suspect)
    private
    view
    returns (WardDetails storage)
  {
    WardDetails storage _ward = _getWardUnsafe(_suspect);
    require(_checkWardExists(_ward), 'Ward doesnt exist');
    return _ward;
  }

  function _addGuardian(address _wardAddress, address _guardian) private {
    require(_guardian != address(0), 'Cant use ZeroAddress as Guardian');
    require(
      !_isListedAsGuardian(_wardAddress, _guardian),
      'Guardian is already added'
    );

    WardDetails storage _ward = _getWard(_wardAddress);
    _ward.guardians[_guardian] = _now();
    _ward.guardiansLength++;
  }

  function _removeGuardian(address _wardAddress, address _guardian) private {
    require(
      _isListedAsGuardian(_wardAddress, _guardian),
      'Guardian does not exist'
    );

    WardDetails storage _ward = _getWard(_wardAddress);
    require(_ward.guardiansLength > 1, 'Cant remove last Guardian');

    _ward.guardians[_guardian] = 0;
    _ward.guardiansLength--;
  }

  modifier onlyTrusted(address _wardAddress) {
    require(
      _isTrusted(_wardAddress, _msgSender(), _now()),
      'Sender not trusted'
    );
    _;
  }

  modifier onlyBy(address _suspect) {
    require(_suspect == _msgSender(), 'Sender not target');
    _;
  }

  function register(
    address _suspect,
    address[] calldata _guardians,
    address[] calldata _trusted
  ) public onlyBy(_suspect) {
    WardDetails storage _ward = _getWardUnsafe(_suspect);
    bool exists = _checkWardExists(_ward);

    require(exists == false, 'Ward exists already');
    require(_guardians.length > 0, 'Ward needs at least one Guardian');

    _ward.requiredBond = 0;
    _ward.timelockPeriod = 1 days;
    _ward.guardiansLength = _guardians.length;
    for (uint256 i = 0; i < _guardians.length; i++) {
      _ward.guardians[_guardians[i]] = 1; // guardians on register are valid from the beginning
    }
    for (uint256 i = 0; i < _trusted.length; i++) {
      _ward.trustedModules[_trusted[i]] = 1; // modules on register are trusted from the beginning
    }
  }

  function setTimelockPeriod(address _suspect, uint256 _timelockPeriod)
    public
    onlyTrusted(_suspect)
  {
    WardDetails storage _ward = _getWard(_suspect);
    _ward.timelockPeriod = _timelockPeriod;
  }

  function getTimelockPeriod(address _suspect) public view returns (uint256) {
    WardDetails storage _ward = _getWard(_suspect);
    return _ward.timelockPeriod;
  }

  function setRequiredBond(address _suspect, uint256 _requiredBond)
    public
    onlyTrusted(_suspect)
  {
    WardDetails storage _ward = _getWard(_suspect);
    _ward.requiredBond = _requiredBond;
  }

  function getRequiredBond(address _suspect) public view returns (uint256) {
    WardDetails storage _ward = _getWard(_suspect);
    return _ward.requiredBond;
  }

  function addGuardian(address _wardAddress, address _guardian)
    public
    onlyTrusted(_wardAddress)
  {
    _addGuardian(_wardAddress, _guardian);

    emit GuardianAdded(_wardAddress, _guardian);
  }

  function removeGuardian(address _wardAddress, address _guardian)
    public
    onlyTrusted(_wardAddress)
  {
    _removeGuardian(_wardAddress, _guardian);

    emit GuardianRemoved(_wardAddress, _guardian);
  }

  function isGuardian(address _ward) public view returns (bool) {
    return _isGuardian(_ward, _msgSender(), _now());
  }

  function isGuardian(address _ward, address _suspect)
    public
    view
    returns (bool)
  {
    return _isGuardian(_ward, _suspect, _now());
  }

  function getGuardianLength(address _suspect) public view returns (uint256) {
    WardDetails storage _ward = _getWard(_suspect);
    return _ward.guardiansLength;
  }
}
