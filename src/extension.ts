import { TextEncoder } from "util";
import * as vscode from "vscode";

const classTemplate = (
  namespace: string,
  className: string
) => `namespace ${namespace}
{
    public class ${className}
    {

    }
}
`;

const getNamespace = (dir: string) =>
  traverseUpDirsUntilMatch(dir, "*.csproj").then((path) =>
    Promise.resolve(dir.slice(dir.indexOf(path)).replace("/", "."))
  );

const traverseUpDirsUntilMatch = (dir: string, pattern: string) =>
  dir
    .split("/")
    .map((_, i, a) => a.slice(0, a.length - i).join("/"))
    .reduce(
      (acc, dir) =>
        acc.then((x) =>
          x
            ? Promise.resolve(x)
            : vscode.workspace
                .findFiles(dir + "/" + pattern)
                .then((files) =>
                  files.length > 0
                    ? Promise.resolve(dir.split("/").pop())
                    : Promise.resolve(x)
                )
        ),
      Promise.resolve<null | undefined | string>(null)
    )
    .then((path) => (path ? Promise.resolve(path) : Promise.reject()));

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "csharp.createclass",
    (uri: vscode.Uri) => {
      const clickedPath = vscode.workspace.asRelativePath(uri);

      getNamespace(clickedPath)
        .then((namespace) => {
          vscode.window
            .showInputBox({
              placeHolder: "Class Name",
              prompt: "Enter a Class Name:",
            })
            .then((className = "") => {
              const filePath = `${uri.path}/${className}.cs`;

              vscode.workspace.fs
                .writeFile(
                  vscode.Uri.file(filePath),
                  new TextEncoder().encode(classTemplate(namespace, className))
                )
                .then(() => {
                  vscode.workspace
                    .openTextDocument(vscode.Uri.file(filePath))
                    .then(vscode.window.showTextDocument);
                });
            });
        })
        .catch(() => {
          vscode.window.showErrorMessage(`Couldn't work out the namespace!`);
        });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
