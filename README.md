## Installing AWSCLI

```
brew install awscli
aws --version
```

Configuring the AWSCLI with your IAM credentials.

```
aws configure
```

Visit the [AWS IAM console](https://console.aws.amazon.com/iam) and create a new user if you don't have one. Next select **Create access key** and copy the ID and access key values into the terminal prompts. I set my default region to `ap-southeast-2`, which is the Sydney serverfarms. I also set my [output format](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-output.html) to `json`, but `table` and `text` are nice to.

You'll need awscli setup to deploy to your account.

Make sure you have NodeJS installed and install `serverless` globally.

```
yarn global add serverless
```

Then login by following the prompts. Take not of your username, this will later become your `org` name.

```
serverless login
```

Finally you'll need to select **add app** and take not of your `app` name here as well.

## Creating the project

```
mkdir simple-rest && cd simple-rest
```

Create a basic serverless AWS with NodeJS project within the current directory

```
serverless create --template aws-nodejs
```

Install all the required node modules

```
yarn add -D aws-sdk
```

## Configuring the CloudFormation template

Serverless uses `YAML` or `json` to configure it's deployment template. This looks much the same as a CloudFormation template, infact it's identical apart from the three lines below. You can imagine YAML like a JSON object, where the indentation signifies another level into the object tree and the `-` represent the beginning of an array value. These are specific to serverless and allow the deployment scripts to generate unique names and store references and such against your serverless account. The `service` becomes the prefixing name of your microservice which is defined later in the `functions` key, the `app` should be the name of your application on the serverless network and `org` is basically your username on that network.

Here is where we use our `org` and `app` name we created earlier.

```yaml
service: simple-app
app: simple-rest
org: mitchpierias
```

Now we can setup the AWS environment. The important part here is the `iamRoleStatements`, this will grant access to read individual and all records in the DynamoDB table we will define later. We want to link to our generated table dynamically, so we're are using the `!GetAtt JobTable.Arn` shorthand to get the AWS Resource Name generated when our table is deployed in the cloud.

```yaml
provider:
  name: aws
  runtime: nodejs12.x
  stage: dev
  region: ap-southeast-2 # Deploys to Sydney
  iamRoleStatements:
   - Effect: "Allow"
     Action:
        - dynamodb:Scan
     Resource: !GetAtt JobTable.Arn
```

In the future we will have Webpack package any required `node_modules` into a condensed package, but for now we were only using the `aws-sdk` module which comes mounted on all lambda services.

```yaml
package:
 exclude:
   - node_modules/*
   - .gitignore
   - README.md
   - yarn.lock
```

We can also configure CloudFormation to create the DynamoDB table while we're deploying. Here we're defining a Resource called `JobTable` which is a DynamoDB table called `jobs`. The KeySchema defines the index and attribute definitions specify the type of that index, in this case it's a string `S`.

```yaml
resources:
  Resources:
    JobTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: jobs
        KeySchema:
          - AttributeName: UUID
            KeyType: HASH
        AttributeDefinitions:
          - AttributeName: UUID
            AttributeType: S
        ProvisionedThroughput:
          ReadCapacityUnits: 5
          WriteCapacityUnits: 2
```

Finally we have define the service `jobs` which will use the `getJobs` function exported from `handler.ts`, and we're configuring our service to respond to HTTP GET requests at the root path `"/"`.

```yaml
functions:
  jobs:
    handler: handler.getJobs
    events:
      - http:
          path: /
          method: get
```

## Integrating DynamoDB

We're going to move into the `handler.js` file now and define the `getJobs` function which will handle the HTTP GET request events.

```javascript
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
```

## Finishing up

if you've configured your `awscli`, you can now run `serverless deploy` and your microservice and resources will be spun up and linked in the cloud based upon the permission we defined.

Navigate to the GET endpoint that serverless outputs after deploying to see your table data returned. We don't have any items, so you'll see an empty array. To add items you will need to visit the DynamoDB Dashboard, open the table and add items, then refresh this page.

[More Amazon DynamoDB examples can be found here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-examples.html)
