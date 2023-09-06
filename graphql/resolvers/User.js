const User = require("../../models/User");
const { ApolloError } = require("apollo-server-errors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

module.exports = {
  Mutation: {
    async registerUser(_, { registerInput: { username, email, password } }) {
      const oldUser = await User.findOne({ email });

      if (oldUser) {
        throw new ApolloError(
          "A user is already registered with the email" + email,
          "USER_ALREADY_EXISTS"
        );
      }

      var encryptedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username: username,
        email: email.toLowerCase(),
        password: encryptedPassword,
      });

      const token = jwt.sign(
        { user_id: newUser._id, email },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
        }
      );
      newUser.token = token;

      const res = await newUser.save();
      return {
        id: res.id,
        ...res._doc,
      };
    },
    async loginUser(_, { loginInput: { username, email, password } }) {
      const user = await User.findOne({ email });

      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign(
          { user_id: user._id, email },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRES_IN,
          }
        );

        user.token = token;
        return {
          id: user.id,
          ...user._doc,
        };
      } else {
        throw new ApolloError("Incorrect password", "INCORRECT_PASSWORD");
      }
    },
    updateUser: async (_, { id, username, email }) => {
      const user = await User.findByIdAndUpdate(
        id,
        { username, email },
        { new: true }
      );
      if (!user) {
        throw new ApolloError("User not found");
      }
      return user;
    },
    deleteUser: async (_, { id }) => {
      const user = await User.findByIdAndRemove(id);
      if (!user) {
        throw new ApolloError("User not found");
      }
      return "User deleted successfully";
    },
  },
  Query: {
    getUsers: async () => await User.find(),
    getUser: async (_, { id }) => await User.findById(id),
  },
};
