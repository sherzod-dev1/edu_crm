module.exports = (sequelize, DataTypes) => {
    const Classroom = sequelize.define("Classroom", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        floor: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 1,
        },
        capacity: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 20,
        },
        room_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'standard',
        },
        equipment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "classrooms",
        timestamps: true,
        underscored: true,
    });

    Classroom.associate = (models) => {
        if (models.Branch) {
            Classroom.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Group) {
            Classroom.hasMany(models.Group, { foreignKey: "classroom_id", as: "groups" });
        }
        if (models.Lesson) {
            Classroom.hasMany(models.Lesson, { foreignKey: "classroom_id", as: "lessons" });
        }
    };

    return Classroom;
};
