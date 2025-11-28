const mongoose = require("mongoose");

// Load .env từ thư mục gốc
require("dotenv").config({ path: __dirname + "/../.env" });

const models = require("../modelData/models.js");

const User = require("./userModel.js");
const Photo = require("./photoModel.js");
const SchemaInfo = require("./schemaInfo.js");

const versionString = "1.0";

async function dbLoad() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Successfully connected to MongoDB Atlas!");
  } catch (error) {
    console.log("Unable connecting to MongoDB Atlas!");
    console.error(error);
    process.exit(1);
  }

  // Reset DB
  await User.deleteMany({});
  await Photo.deleteMany({});
  await SchemaInfo.deleteMany({});

  const userModels = models.userListModel();
  const mapFakeId2RealId = {};

  // ===== Insert users =====
  for (const user of userModels) {
    let userObj = new User({
      first: user.first_name,
      last_name: user.last_name,
      location: user.location,
      description: user.description,
      occupation: user.occupation,
    });

    try {
      await userObj.save();
      mapFakeId2RealId[user._id] = userObj._id;
      user.objectID = userObj._id;

      console.log(
        `Adding user: ${user.first_name} ${user.last_name} with ID ${user.objectID}`
      );
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  // ===== Insert photos =====
  const photoModels = [];
  const userIDs = Object.keys(mapFakeId2RealId);

  userIDs.forEach((id) => {
    photoModels.push(...models.photoOfUserModel(id));
  });

  for (const photo of photoModels) {
    let photoObj = await Photo.create({
      file_name: photo.file_name,
      date_time: photo.date_time,
      user_id: mapFakeId2RealId[photo.user_id],
    });

    photo.objectID = photoObj._id;

    if (photo.comments) {
      photo.comments.forEach((comment) => {
        photoObj.comments.push({
          comment: comment.comment,
          date_time: comment.date_time,
          user_id: comment.user.objectID,
        });

        console.log(
          `Adding comment (${comment.comment.length} chars) by user ${comment.user.objectID} → photo ${photo.file_name}`
        );
      });
    }

    try {
      await photoObj.save();
      console.log(
        `Adding photo: ${photo.file_name} of user ${photoObj.user_id}`
      );
    } catch (error) {
      console.error("Error creating photo:", error);
    }
  }

  // ===== Schema Info =====
  try {
    const schemaInfo = await SchemaInfo.create({
      version: versionString,
    });
    console.log(`SchemaInfo created with version ${schemaInfo.version}`);
  } catch (error) {
    console.error("Error creating schemaInfo:", error);
  }

  mongoose.disconnect();
}

dbLoad();
