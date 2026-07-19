import mongoose from "mongoose";

const authDbUrl = "mongodb+srv://anandk19570_db_user:lN0lZgOkiITVknWl@cluster0.cizajxb.mongodb.net/auth";

const userSchema = new mongoose.Schema({
  firebaseUid: String,
  name: String,
  email: String,
  avatar: String,
  provider: String,
  plan: { type: String, default: "free" },
  credits: { type: Number, default: 100 },
  totalCredits: { type: Number, default: 100 }
});

const User = mongoose.model("User", userSchema);

async function run() {
  await mongoose.connect(authDbUrl);
  console.log("Connected to Auth DB");
  
  let user = await User.findOne({ email: "integration_tester@nexusai.com" });
  if (!user) {
    user = await User.create({
      firebaseUid: "uid_integration_tester_999",
      name: "Integration Tester",
      email: "integration_tester@nexusai.com",
      credits: 100,
      totalCredits: 100
    });
    console.log("Created test user:", user._id.toString());
  } else {
    user.credits = 100;
    await user.save();
    console.log("Found existing user, reset credits to 100. User ID:", user._id.toString());
  }
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
