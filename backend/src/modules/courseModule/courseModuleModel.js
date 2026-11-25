module.exports = (sequelize, DataTypes) => {
    const CourseModule = sequelize.define("CourseModule", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        order_number: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 1,
        },
        duration_hours: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "course_modules",
        timestamps: true,
        underscored: true,
    });

    CourseModule.associate = (models) => {
        if (models.Course) {
            CourseModule.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
    };

    return CourseModule;
};
