import { spawn } from 'child_process';
import path from 'path';

const scriptpath = path.join(__dirname, 'name_extraction.py');

const pythonProcess = spawn('python3', [scriptpath, "(ミセスの素顔)(MRSS-093)息子の手術費用を稼ぐために、愛する妻が1年間資産家の肉便器になる契約を結びました。波多野結衣 藤森里穂"]);

const extracName = () => new Promise((resolve, reject) => {
  pythonProcess.stdout.on("data", data =>{
      resolve(data.toString()); // <------------ by default converts to utf-8
  });
  process.stderr.on("data", reject);
});

(async () => {
  const output = await extracName();
  console.log(output);
})();
