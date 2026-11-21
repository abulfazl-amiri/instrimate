import bcrypt from "bcrypt";

const hash = async function (password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
};

const compare = async function (password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
};

export { hash, compare };
