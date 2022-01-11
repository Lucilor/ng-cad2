import {ObjectOf} from "@utils";
import axios from "axios";
import child_process from "child_process";
import del from "del";
import FormData from "form-data";
import fs from "fs";
import gulp from "gulp";
import zip from "gulp-zip";
import minimist from "minimist";
import path from "path";

const postFormData = (url: string, data: ObjectOf<any>, file?: fs.ReadStream) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (file) {
        formData.append("file", file);
    }
    return axios.post(url, formData, {headers: formData.getHeaders()});
};

const args = minimist(process.argv.slice(2));
const host = args.local ? "https://localhost" : "https://www.let888.cn";
const token = "wefarvwEFqwdWEFfefw!$#^##%!";
const targetDir = "C:/wamp64/www/static";
const targetDistDir = targetDir + "/ng-cad2";
const tmpDir = "./.tmp";
const zipName = "upload.zip";
const changelogName = "ngcad2_changelog.json";
const changelogPath = path.join(targetDir, changelogName);
const backupName = "ng_cad2";

gulp.task("build", () => child_process.exec("npm run build"));
gulp.task("clean", () => del(targetDistDir, {force: true}));
gulp.task("copy", () => gulp.src("./dist/**").pipe(gulp.dest(targetDistDir)));

gulp.task("zip", (callback) => {
    const globs = ["ng-cad2/**/*"];
    if (!args.noChangelog) {
        globs.push(changelogName);
        const changelog = JSON.parse(fs.readFileSync(changelogPath).toString());
        const now = new Date();
        const then = new Date(changelog[0].timeStamp);
        if (now.getFullYear() !== then.getFullYear() || now.getMonth() !== then.getMonth() || now.getDate() !== then.getDate()) {
            console.error("changelog time error");
            callback();
            return;
        }
        changelog[0].timeStamp = new Date().getTime();
        fs.writeFileSync(changelogPath, JSON.stringify(changelog));
    }
    return gulp.src(globs, {dot: true, cwd: targetDir, base: targetDir}).pipe(zip(zipName)).pipe(gulp.dest(tmpDir));
});

gulp.task("fetchChangelog", async () => {
    const response = await axios.get(host + "/static/ngcad2_changelog.json");
    fs.writeFileSync(changelogPath, JSON.stringify(response.data));
});

gulp.task("upload", async () => {
    const url = host + "/n/kgs/index/login/upload";
    if (url.includes("localhost")) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    const data = {dest: "static", token, toDelete: ["ng-cad2"], backup: backupName};
    const response = await postFormData(url, data, fs.createReadStream(path.join(tmpDir, zipName)));
    console.log(response.data);
});

gulp.task("restore", async () => {
    const response = await postFormData(host + "/n/kgs/index/login/restore", {name: backupName});
    console.log(response.data);
});

gulp.task("default", gulp.series("build", "clean", "copy", "zip", "upload"));
