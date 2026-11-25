module.exports = (sequelize, DataTypes) => {
    const TeacherAttendance = sequelize.define("TeacherAttendance", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'present', // 'present', 'absent', 'late', 'excused'
            allowNull: false,
        },
        check_in: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        check_out: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        note: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        marked_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "teacher_attendances",
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['teacher_id', 'date']
            }
        ]
    });

    TeacherAttendance.associate = (models) => {
        if (models.Teacher) {
            TeacherAttendance.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.Branch) {
            TeacherAttendance.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.User) {
            TeacherAttendance.belongsTo(models.User, { foreignKey: "marked_by", as: "marker" });
        }
    };

    return TeacherAttendance;
};
