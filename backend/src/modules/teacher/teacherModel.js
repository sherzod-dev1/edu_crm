module.exports = (sequelize, DataTypes) => {
    const Teacher = sequelize.define("Teacher", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        specialization: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        experience_year: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 0,
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        salary_type: {
            type: DataTypes.STRING(30),
            allowNull: true,
            defaultValue: 'fixed',
        },
        salary_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "teachers",
        timestamps: true,
        underscored: true,
    });

    Teacher.associate = (models) => {
        if (models.User) {
            Teacher.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
        }
        if (models.Branch) {
            Teacher.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Course) {
            Teacher.hasMany(models.Course, { foreignKey: "teacher_id", as: "courses" });
        }
        if (models.Group) {
            Teacher.hasMany(models.Group, { foreignKey: "teacher_id", as: "groups" });
        }
        if (models.Lesson) {
            Teacher.hasMany(models.Lesson, { foreignKey: "teacher_id", as: "lessons" });
        }
        if (models.TeacherAttendance) {
            Teacher.hasMany(models.TeacherAttendance, { foreignKey: "teacher_id", as: "attendances" });
        }
    };

    return Teacher;
};
