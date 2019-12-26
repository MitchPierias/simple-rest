const AWS = require('aws-sdk');

// We can pull this region information from serverless,
// but we will define it statically for now
AWS.config.update({ region: 'ap-southeast-2' });

// Create a DynamoDB service instance
const dynamo = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

// Define the query attributes
const params = {
  TableName: 'jobs'
};

module.exports.getJobs = async event => {
  // Scan all items matching the `params`, this will fetch everything
  const data = await dynamo.scan(params).promise();
  // Create and return out response
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
