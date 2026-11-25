module.exports = (sequelize, DataTypes) => {
    const Student = sequelize.define("Student", {
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
        birth_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        gender: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        parent_name: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        parent_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        parent_user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        education: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        joined_at: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        coins: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
    }, {
        tableName: "students",
        timestamps: true,
        underscored: true,
    });

    Student.associate = (models) => {
        if (models.User) {
            Student.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
            Student.belongsTo(models.User, { foreignKey: "parent_user_id", as: "parent_user" });
        }
        if (models.Branch) {
            Student.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Group) {
            Student.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.Course) {
            Student.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
        if (models.GroupStudent) {
            Student.hasMany(models.GroupStudent, { foreignKey: "student_id", as: "group_students" });
        }
    };

    return Student;
};
