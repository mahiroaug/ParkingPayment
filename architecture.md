# architecture

sequenceDiagram
participant Client
participant API Gateway
participant SQS
participant Lambda
participant DynamoDB
participant Fireblocks
Client->>+API Gateway: POST /createVaultAndMint
API Gateway->>+SQS: Enqueue request
SQS->>-API Gateway: Return MessageID
API Gateway->>-Client: Return 202 Accepted with MessageID
loop Poll Queue
Lambda->>+SQS: Receive Message
SQS->>-Lambda: Return Message
alt Message Exists
Lambda->>+Fireblocks: 1A: Create Vault
Fireblocks->>-Lambda: Return Vault
Lambda->>+DynamoDB: 1B: Insert Vault
DynamoDB->>-Lambda: Acknowledge
Lambda->>+Fireblocks: 1C: Mint Token
Fireblocks->>-Lambda: Acknowledge  
 Lambda->>+Fireblocks: 1D: Register Card ID
Fireblocks->>-Lambda: Acknowledge
Lambda->>+DynamoDB: 1E: Check Registry
DynamoDB->>-Lambda: Return Result
Lambda->>+DynamoDB: Update process status
DynamoDB->>-Lambda: Acknowledge
Lambda->>SQS: Delete Message  
 end
end
loop Client Polling
Client->>+API Gateway: GET /status/{messageID}  
 API Gateway->>+DynamoDB: Get process status
DynamoDB->>-API Gateway: Return status
alt Process Complete
API Gateway->>-Client: Return 200 OK
else Process Incomplete  
 API Gateway->>-Client: Return 202 Accepted
end  
 end
