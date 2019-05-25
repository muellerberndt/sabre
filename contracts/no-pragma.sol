contract NoPragma {
    function f() public {
        selfdestruct(msg.sender);
    }
}

