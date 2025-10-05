@echo off
echo Deploying Ingressos contract to Sepolia testnet...

REM Check if private key is set
if "%PRIVATE_KEY%"=="" (
    echo Error: PRIVATE_KEY environment variable not set
    echo Please set your private key: set PRIVATE_KEY=0x1234...
    pause
    exit /b 1
)

REM Deploy using public Sepolia RPC
forge script script/Deploy.s.sol --rpc-url https://rpc.sepolia.org --broadcast --private-key %PRIVATE_KEY%

echo.
echo Deployment complete!
echo Check the output above for the contract address.
echo.
pause
