const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        // Ensure no additional indexes on the ID field
        indexes: [],
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        // Ensure no additional indexes on the username field
        indexes: [],
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        // Ensure no additional indexes on the email field
        // To prevent creating unique indexes, you can omit unique: true
        unique: false,
        indexes: [],
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        indexes: [],
    }
}, {
    // Ensure no additional indexes are created for this model
    indexes: []
});

const BlogPost = sequelize.define('BlogPost', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        // Ensure no additional indexes on the ID field
        indexes: [],
    },
    youtube_title: {
        type: DataTypes.STRING,
        allowNull: false,
        // Ensure no additional indexes on the youtube_title field
        indexes: [],
    },
    youtube_link: {
        type: DataTypes.STRING,
        allowNull: true,
        // Ensure no additional indexes on the youtube_link field
        indexes: [],
    },
    transcript: {
        type: DataTypes.TEXT,
        allowNull: false,
        // Ensure no additional indexes on the transcript field
        indexes: [],
    },
    generated_content: {
        type: DataTypes.TEXT,
        allowNull: false,
        // Ensure no additional indexes on the generated_content field
        indexes: [],
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        // Ensure no additional indexes on the created_at field
        indexes: [],
    }
}, {
    // Ensure no additional indexes are created for this model
    indexes: []
});

// Define relationships
User.hasMany(BlogPost, { foreignKey: 'user_id' });
BlogPost.belongsTo(User, { foreignKey: 'user_id' });

sequelize.sync({ alter: true })
    .then(() => console.log('Database & tables created!'))
    .catch(err => console.log('Error creating tables: ' + err));

module.exports = { User, BlogPost };
