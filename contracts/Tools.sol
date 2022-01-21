//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Tools {
    function hashLeaf(uint amount, 
        uint holdedBaseTokensAmount,  
        address _sender) public pure returns(bytes32){
            return keccak256(abi.encode(amount, holdedBaseTokensAmount, _sender));
        }

    function hashNodes(bytes32 left, bytes32 right) public pure returns(bytes32){
        if(uint(left)>uint(right)){
            return keccak256(abi.encode(left, right));
        }else{
            return keccak256(abi.encode(right, left));
        }
    }

    function hashSingle(bytes32 one) public pure returns(bytes32){
        return hashNodes(one, bytes32(0));
    }

    function nodeVerificationPasses(uint amount, 
        uint holdedBaseTokensAmount,  
        address _sender,
        bytes32[] memory proof, 
        bytes32 _rootHash) public pure returns(bool){
        bytes32 nodeHash = hashLeaf(amount, holdedBaseTokensAmount, _sender);
        for(uint i=0; i<proof.length;i++){
            nodeHash = hashNodes(nodeHash, proof[i]);
        }
        return _rootHash == nodeHash;
    }
}