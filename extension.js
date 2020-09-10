// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function createRelevantScssFile(uri) {
	const importName = uri.split('\\').pop();

	const editor = vscode.window.activeTextEditor;

	editor.edit((editBuilder) =>
		editBuilder.insert(
			new vscode.Position(0, 0),
			'import "./' + importName + '";\n'
		)
	);

	fs.writeFile(uri, '', function (err) {
		if (err) throw err;
	});
	vscode.workspace.openTextDocument(vscode.Uri.file(uri)).then(doc => {
		vscode.window.showTextDocument(doc);
	});
}

function getClassFromCursorPosition(cursorText, characterNumber) {
	let startChar = 0;
	let endChar = 0;
	let charToCheckFor;
	for (let index = characterNumber; index >= 0; index--) {
		let chararacter = cursorText.substring(index, index + 1);
		if (chararacter == '"' || chararacter == " ") {
			startChar = index + 1;
			charToCheckFor = chararacter;
			break;
		}
	}
	for (let index = characterNumber; index <= cursorText.length; index++) {
		let chararacter = cursorText.substring(index, index + 1);
		if (chararacter == charToCheckFor) {
			endChar = index;
			break;
		}
	}

	if (endChar != 0 && startChar != 0) {
		let cursorClass = cursorText.substring(startChar, endChar);
		if (cursorClass != "") {
			return '.' + cursorClass
		}
	}

	return "";
}
function createClassName(classToWrite) {
	const editor = vscode.window.activeTextEditor;
	const lastLine = editor.document.lineAt(editor.document.lineCount - 1);

	editor.edit((editBuilder) =>
		editBuilder.insert(
			new vscode.Position(lastLine.lineNumber + 1, 0),
			'\n\n' + classToWrite + '{\n\n}'
		)
	);

}

function getClassName() {
	let getClassFromJs = lineText => {
		if (lineText.search('className="') != -1) {
			const splitted = lineText.split('className="');
			const classnames = splitted[1].split('"')[0]
			return classnames.split(" ")[0];
		}

		return null;
	};
	let editor = vscode.window.activeTextEditor;
	const position = editor.selection.active;
	console.log('ere comes the position', position);
	let range = editor.document.lineAt(position.line).range;

	const cursorText = editor.document.getText(range);
	const classNameFromCursor = getClassFromCursorPosition(cursorText, position.character)
	if (classNameFromCursor) {
		return classNameFromCursor;
	}
	let className = getClassFromJs(cursorText);

	if (className) {
		return '.' + className;
	}

	return null;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let switchToRelevantFile = vscode.commands.registerCommand('switchtoscss.switchToRelevantFile', function () {

		var currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		var res = currentlyOpenTabfilePath.split('.');
		const fileType = res[1]
		if (fileType == "js") {
			let uri = res[0] + '.scss'
			if (fs.existsSync(uri)) {
				const className = getClassName();

				vscode.workspace.openTextDocument(vscode.Uri.file(uri)).then(doc => {
					vscode.window.showTextDocument(doc);
				});

				if (className) {
					vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(uri)).then(symbols => {
						let symbolSuccess = false;
						if (symbols) {
							symbols.forEach(symbol => {
								if (symbol.name == className) {
									let editor = vscode.window.activeTextEditor;
									editor.selection = new vscode.Selection(symbol.location.range.start, symbol.location.range.end);
									editor.revealRange(symbol.location.range);
									var p = new vscode.Position(symbol.location.range.start, 0);
									var s = new vscode.Selection(p, p);
									symbolSuccess = true;
								}
							});
						}
						if (!symbolSuccess) {
							vscode.window
								.showInformationMessage('Could not find classname, would you like to create it?', ...['Yes please'])
								.then(selection => {
									createClassName(className);
								});
						}
					})
				}
			}
			else {
				vscode.window.showInformationMessage('SCSS file not found, would you like to create it?', ...['Yes please'])
					.then(selection => {
						createRelevantScssFile(uri);
					});
			}
		}
		else {
			let uri = res[0] + '.js'
			if (fs.existsSync(uri)) {
				vscode.workspace.openTextDocument(vscode.Uri.file(uri)).then(doc => {
					vscode.window.showTextDocument(doc);
				});
			} else {
				vscode.window.showInformationMessage('JS file not found');
			}
		}
	});

	context.subscriptions.push(switchToRelevantFile);

	let createClass = vscode.commands.registerCommand('switchtoscss.createClass', function () {

		var currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		var res = currentlyOpenTabfilePath.split('.');
		const fileType = res[1]
		if (fileType == "js") {
			let uri = res[0] + '.scss'
			let classToWrite = getClassName();

			if (classToWrite) {
				vscode.workspace.openTextDocument(vscode.Uri.file(uri)).then(doc => {
					vscode.window.showTextDocument(doc).then(doc => {
						const editor = vscode.window.activeTextEditor;

						vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(uri)).then(symbols => {
							let symbolSuccess = false;
							if (symbols) {
								symbols.forEach(symbol => {
									if (symbol.name == classToWrite) {
										let editor = vscode.window.activeTextEditor;
										editor.selection = new vscode.Selection(symbol.location.range.start, symbol.location.range.end);
										editor.revealRange(symbol.location.range);
										var p = new vscode.Position(symbol.location.range.start, 0);
										var s = new vscode.Selection(p, p);
										symbolSuccess = true;

										vscode.window.showInformationMessage('ClassName already exists');
									}
								});
							}
							if (!symbolSuccess) {
								createClassName(classToWrite);
							}
						})

						if (editor) {

						}

					})
				});
			}

		}
		else {
			vscode.window.showInformationMessage('Only works from js => scss file');
		}
	});

	context.subscriptions.push(createClass);

	let createRelevantFile = vscode.commands.registerCommand('switchtoscss.createRelevantFile', function () {

		var currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		var res = currentlyOpenTabfilePath.split('.');
		const fileType = res[1]
		if (fileType == "js") {
			let uri = res[0] + '.scss'
			if (fs.existsSync(uri)) {
				vscode.window.showInformationMessage('File already exist, please use the switch function instead');
			}
			else {
				createRelevantScssFile(uri);
			}

		}
		else {
			vscode.window.showInformationMessage('Only works from js => scss file');
		}
	});

	context.subscriptions.push(createRelevantFile);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
