// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import 'hardhat/console.sol';

contract InfraGuardianVault is Context {
  enum WardStates { None, Active, Recovery }

  struct WardDetails {
    WardStates state;
    uint256 timelockPeriod;
    uint256 guardiansLength;
    mapping(address => uint256) guardians;
    mapping(address => uint256) trustedModules;
    mapping(bytes32 => address[]) approvedActions;
  }

  mapping(address => WardDetails) public wards;

  event GuardianAdded(address ward, address guardian);
  event GuardianRemoved(address ward, address guardian);
  event TrusteeAdded(address ward, address trustee);
  event TrusteeRemoved(address ward, address trustee);

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

  function _isListedAsTrusted(address _wardAddress, address _suspect)
    private
    view
    returns (bool)
  {
    return _isTrusted(_wardAddress, _suspect, uint256(-1)); // ignore timestamp
  }

  function _checkWardExists(WardDetails storage _ward)
    private
    view
    returns (bool)
  {
    return _ward.state != WardStates.None;
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

  function _addTrustee(address _wardAddress, address _trustee) private {
    require(_trustee != address(0), 'Cant use ZeroAddress as Guardian');
    require(
      !_isListedAsTrusted(_wardAddress, _trustee),
      'Guardian is already added'
    );

    WardDetails storage _ward = _getWard(_wardAddress);
    _ward.trustedModules[_trustee] = _now();
  }

  function _removeTrustee(address _wardAddress, address _trustee) private {
    require(
      _isListedAsTrusted(_wardAddress, _trustee),
      'Trustee does not exist'
    );

    WardDetails storage _ward = _getWard(_wardAddress);
    _ward.trustedModules[_trustee] = 0;
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

  modifier onlyAllowWardState(address _suspect, WardStates _state) {
    WardDetails storage _ward = _getWardUnsafe(_suspect);
    require(_ward.state == _state, 'Not allowed Ward state');
    _;
  }

  // modifier onlyDenyWardState(address _suspect, WardStates _state) {
  //   WardDetails storage _ward = _getWardUnsafe(_suspect);
  //   require(_ward.state != _state, 'Denied Ward state');
  //   _;
  // }

  function register(
    address _suspect,
    address[] calldata _guardians,
    address[] calldata _trusted
  ) public onlyBy(_suspect) onlyAllowWardState(_suspect, WardStates.None) {
    WardDetails storage _ward = _getWardUnsafe(_suspect);

    _ward.state = WardStates.Active;
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
    onlyAllowWardState(_suspect, WardStates.Active)
  {
    WardDetails storage _ward = _getWard(_suspect);
    _ward.timelockPeriod = _timelockPeriod;
  }

  function getTimelockPeriod(address _suspect) public view returns (uint256) {
    WardDetails storage _ward = _getWard(_suspect);
    return _ward.timelockPeriod;
  }

  function addGuardian(address _wardAddress, address _guardian)
    public
    onlyTrusted(_wardAddress)
    onlyAllowWardState(_wardAddress, WardStates.Active)
  {
    _addGuardian(_wardAddress, _guardian);

    emit GuardianAdded(_wardAddress, _guardian);
  }

  function removeGuardian(address _wardAddress, address _guardian)
    public
    onlyTrusted(_wardAddress)
    onlyAllowWardState(_wardAddress, WardStates.Active)
  {
    _removeGuardian(_wardAddress, _guardian);

    emit GuardianRemoved(_wardAddress, _guardian);
  }

  function addTrustee(address _wardAddress, address _trustee)
    public
    onlyTrusted(_wardAddress)
    onlyAllowWardState(_wardAddress, WardStates.Active)
  {
    _addTrustee(_wardAddress, _trustee);

    emit TrusteeAdded(_wardAddress, _trustee);
  }

  function removeTrustee(address _wardAddress, address _trustee)
    public
    onlyTrusted(_wardAddress)
    onlyAllowWardState(_wardAddress, WardStates.Active)
  {
    _removeTrustee(_wardAddress, _trustee);

    emit TrusteeRemoved(_wardAddress, _trustee);
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

  function isTrusted(address _ward) public view returns (bool) {
    return _isTrusted(_ward, _msgSender(), _now());
  }

  function isTrusted(address _ward, address _suspect)
    public
    view
    returns (bool)
  {
    return _isTrusted(_ward, _suspect, _now());
  }

  function getGuardianLength(address _suspect) public view returns (uint256) {
    WardDetails storage _ward = _getWard(_suspect);
    return _ward.guardiansLength;
  }

  function _hasConsensus(
    address _wardAddress,
    address[] storage _approvals,
    uint256 _total
  ) internal view returns (bool) {
    if (_total == 0) return false;
    uint256 _validApprovals = 0;

    for (uint256 i = 0; i < _approvals.length; i++) {
      if (_isGuardian(_wardAddress, _approvals[i], _now())) {
        _validApprovals++;
      }
    }

    return (SafeMath.sub(_total, _validApprovals) <= _validApprovals);
  }

  function isApproved(address _wardAddress, bytes32 _hash)
    public
    view
    onlyAllowWardState(_wardAddress, WardStates.Active)
    returns (bool)
  {
    WardDetails storage _ward = _getWard(_wardAddress);
    uint256 _total = _ward.guardiansLength;
    address[] storage _approvals = _ward.approvedActions[_hash];

    return _hasConsensus(_wardAddress, _approvals, _total);
  }

  function approve(
    address _guardianAddress,
    address _wardAddress,
    bytes32 _hash
  )
    public
    onlyAllowWardState(_wardAddress, WardStates.Active)
    onlyBy(_guardianAddress)
  {
    WardDetails storage _ward = _getWard(_wardAddress);
    _ward.approvedActions[_hash].push(_guardianAddress);
  }
}
