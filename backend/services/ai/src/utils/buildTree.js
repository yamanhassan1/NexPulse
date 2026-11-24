export const BuildTree = (files) => {
  const map = new Map();

  files.forEach((file) => {
    map.set(file._id.toString(), {
      ...file.toObject(),
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
