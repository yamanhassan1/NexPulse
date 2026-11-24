export const BuildTree = (files) => {
  const map = new Map();

  files.forEach((file) => {
    const plain = typeof file.toObject === "function" ? file.toObject() : file;
    map.set(plain._id.toString(), {
      ...plain,
      children: [],
    });
  });

  const tree = [];

  files.forEach((file) => {
    const node = map.get(file._id.toString());
    const parent = file.parentId ? map.get(file.parentId.toString()) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};
