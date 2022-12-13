import {ObjectOf} from "@utils";
import axios from "axios";
import child_process from "child_process";
import FormData from "form-data";
import fs from "fs";
import gulp from "gulp";
import zip from "gulp-zip";
import {jsonc} from "jsonc";
import minimist from "minimist";
import path from "path";

const postFormData = (url: string, data: ObjectOf<any>, file?: fs.ReadStream) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  if (file) {
    formData.append("file", file);
  }
  return axios.post(url, formData, {headers: formData.getHeaders(), maxBodyLength: Infinity});
};

const configPath = "./gulp.config.json";
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(
    configPath,
    jsonc.stringify(
      {
        $schema: "./.schemas/gulp.config.schema.json",
        token: "",
        targetDir: ""
      },
      {space: 2}
    )
  );
}
const {token} = jsonc.parse(fs.readFileSync("./gulp.config.json").toString());
const host = "https://www.let888.cn";
const targetDir = "./dist";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const args = minimist(process.argv.slice(2));
const tmpDir = "./.tmp";
const zipName = "upload.zip";
const backupName = "ng_cad2";

gulp.task("build", () => child_process.exec("yarn build"));

gulp.task("zip", () => {
  const globs = ["ng-cad2/**/*"];
  return gulp.src(globs, {dot: true, cwd: targetDir, base: targetDir}).pipe(zip(zipName)).pipe(gulp.dest(tmpDir));
});

gulp.task("upload", async () => {
  const url = host + "/n/kgs/index/login/upload";
  const data = {dest: "static", token, toDelete: ["ng-cad2"], backup: backupName};
  const response = await postFormData(url, data, fs.createReadStream(path.join(tmpDir, zipName)));
  console.log(response.data);
});

gulp.task("restore", async () => {
  const response = await postFormData(host + "/n/kgs/index/login/restore", {name: backupName});
  console.log(response.data);
});

gulp.task("default", gulp.series("build", "zip", "upload"));
