// Topic / Subscription Helper
// https://cloud.google.com/pubsub/docs/admin
// Require Manual Grant Permission to gmail-api-push@system.gserviceaccount.com

const {
    PubSub
} = require(`@google-cloud/pubsub`);

require('dotenv').config();

// Creates a client
const pubsub = new PubSub();
const topicName = process.env.TOPIC_NAME;
const subscriptionName = process.env.SUBSCRIPTION_NAME;

async function createTopic() {
    console.log("Create Topic");
    await pubsub.createTopic(topicName);

    // Lists all topic in the current project
    pubsub.getTopics(function (err, topics) {
        if (!err) {
            topics.forEach(topic => console.log(`Topic : ${topic.name}`));
        }
    });
}

// Create Subsription
async function createSubscription() {
    console.log("Create Subscription");
    await pubsub.topic(topicName).createSubscription(subscriptionName);

    // Lists all subscriptions in the current project
    const [subscriptions] = await pubsub.getSubscriptions();
    console.log('Subscriptions:');
    subscriptions.forEach(subscription => console.log(`Subscription : ${subscription.name}`));
}

//https://cloud.google.com/nodejs/docs/reference/pubsub/0.23.x/IAM#setPolicy
async function setIAMPolicy() {

    console.log("Set the IAM Policy : gmail-api-push@system.gserviceaccount.com");
    const topic = pubsub.topic(topicName);
    const subscription = topic.subscription(subscriptionName);

    const myPolicy = {
        bindings: [{
            role: 'roles/owner',
            members: ['serviceAccount:gmail-api-push@system.gserviceaccount.com']
        }]
    };

    topic.iam.setPolicy(myPolicy, function (err, policy, apiResponse) { console.log(err)});
    subscription.iam.setPolicy(myPolicy, function (err, policy, apiResponse) {console.log(err)});

}

async function subscribe() {
    // Subscribe to subscription
    const subscription = pubsub.subscription(subscriptionName);

    const messageHandler = message => {
        var msg = JSON.parse(message.data)
        console.log(msg);
        message.ack();
    };

    console.log("Subscription started");
    // Listen for new messages until timeout is hit
    subscription.on("message", messageHandler);
}

async function publish() {
    console.log("Public message");
    const data = JSON.stringify({
        foo: 'bar'
    });

    // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
    const dataBuffer = Buffer.from(data);

    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    console.log(`Message ${messageId} published.`);
}

async function removeTopic() {
    console.log("Delete Topic");
    await pubsub.topic(topicName).delete();
}

async function removeSubscription() {
    console.log("Delete Subscription");
    await pubsub.subscription(subscriptionName).delete();
}


async function main() {
    // await createTopic();
    // await createSubscription();
    // await setIAMPolicy();

    //await subscribe();
    await publish();

    // await removeSubscription();
    // await removeTopic();
}
main();