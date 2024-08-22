const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('ezyro_37115344_aibloggenerator', 'ezyro_37115344', '2e123f0606265064', {
    host: 'sql110.ezyro.com',
    dialect: 'mysql',
});

sequelize.authenticate()
    .then(() => console.log('Database connected...'))
    .catch(err => console.log('Error: ' + err));

module.exports = sequelize;
