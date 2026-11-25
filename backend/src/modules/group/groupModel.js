module.exports = (sequelize, DataTypes) => {
    const Group = sequelize.define("Group", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        opening_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        days: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        lesson_time: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        classroom_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        capacity: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 15,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "groups",
        timestamps: true,
        underscored: true,
    });

    Group.associate = (models) => {
        if (models.Course) {
            Group.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
        if (models.Teacher) {
            Group.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.Branch) {
            Group.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Classroom) {
            Group.belongsTo(models.Classroom, { foreignKey: "classroom_id", as: "classroom" });
        }
        if (models.Lesson) {
            Group.hasMany(models.Lesson, { foreignKey: "group_id", as: "lessons" });
        }
        if (models.GroupStudent) {
            Group.hasMany(models.GroupStudent, { foreignKey: "group_id", as: "group_students" });
        }
        if (models.Exam) {
            Group.hasMany(models.Exam, { foreignKey: "group_id", as: "exams" });
        }
        if (models.Invoice) {
            Group.hasMany(models.Invoice, { foreignKey: "group_id", as: "invoices" });
        }
    };

    return Group;
};
