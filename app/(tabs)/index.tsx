import * as DocumentPicker from "expo-document-picker"; // Optional if you want to add file picker support
import React, { useRef, useState } from "react";
import {
	Alert,
	Button,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function App() {
	console.log("plasdada : " + Platform.OS);
	const [prompt, setPrompt] = useState("");
	const [output, setOutput] = useState("Your results will appear here...");
	const [isLoading, setIsLoading] = useState(false);
	const [fileName, setFileName] = useState("");
	const API_KEY = "AIzaSyCWZrRnGBJaznYOuXG0msfuwvWgXyW6ubU";
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [uploadedFile, setUploadedFile] = useState<{
		base64: string | null;
		mimeType: string | null;
		name: string | null;
	}>({
		base64: null,
		mimeType: null,
		name: null,
	});

	const handleWebFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const base64 = (reader.result as string).split(",")[1];
			setUploadedFile({
				base64,
				mimeType: file.type || "audio/mpeg",
				name: file.name,
			});
			setFileName(file.name);
		};
		reader.readAsDataURL(file);
	};

	const handlePickFile = async () => {
		if (Platform.OS === "web") {
			fileInputRef.current?.click();
		} else {
			const result = await DocumentPicker.getDocumentAsync({
				type: ["audio/*"],
				copyToCacheDirectory: true,
				base64: true,
			});

			if (result.canceled || !result.assets?.[0]) return;

			const file = result.assets[0] as DocumentPicker.DocumentPickerAsset & {
				base64: string;
			};

			setUploadedFile({
				base64: file.base64 || null,
				mimeType: file.mimeType || "audio/mpeg",
				name: file.name,
			});
			setFileName(file.name || "");
		}
	};

	const handleSubmit = async () => {
		setIsLoading(true);
		setOutput("");

		try {
			const model = "gemini-1.5-flash";
			const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

			let parts: Array<
				{ text: string } | { inlineData: { mimeType: string; data: string } }
			> = [{ text: prompt }];
			if (uploadedFile.base64 && uploadedFile.mimeType) {
				parts.push({
					inlineData: {
						mimeType: uploadedFile.mimeType,
						data: uploadedFile.base64,
					},
				});
			}

			const payload = {
				contents: [{ role: "user", parts }],
			};

			const response = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const result = await response.json();

			if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
				setOutput(result.candidates[0].content.parts[0].text);
			} else {
				setOutput("No result returned.");
			}
		} catch (e: any) {
			console.error(e);
			setOutput(`Error: ${e.message}`);
		}

		setIsLoading(false);
	};

	const handleCopy = async () => {
		if (!output || output === "Your results will appear here...") {
			Alert.alert("Nothing to copy");
			return;
		}
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(output);
			Alert.alert("Copied to clipboard");
		}
	};

	const insertTemplate = (type: "transcribe" | "summary" | "analysis") => {
		const templates = {
			transcribe:
				"Please convert the attached audio file content from Speech to Text, including speaker diarization and their corresponding conversation.",
			summary:
				"Please summarize the text output that was generated from the audio file in bullet points so that details are easily understandable.",
			analysis:
				"Please analyze the provided text based on the following criteria:\n1. Tone of the conversation\n2. Issues highlighted\n3. Key parameters and unique identifiers mentioned\n4. Resolutions suggested",
		};
		setPrompt(templates[type]);
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: 60 }}
		>
			<Text style={styles.heading}>AI-Powered Speech Analyzer</Text>
			<Text style={styles.subtext}>
				Upload an audio file, choose a task, and let AI do the work.
			</Text>
			{Platform.OS === "web" && (
				<input
					type="file"
					accept=".mp3,.wav"
					ref={fileInputRef}
					onChange={handleWebFileChange}
				/>
			)}
			{Platform.OS !== "web" && (
				<TouchableOpacity style={styles.fileBtn} onPress={handlePickFile}>
					<Text style={styles.fileBtnText}>Choose Audio File</Text>
				</TouchableOpacity>
			)}

			{fileName ? (
				<Text style={styles.fileName}>File selected: {fileName}</Text>
			) : null}

			<Text style={styles.label}>Choose a Task</Text>
			<View style={styles.taskButtons}>
				<Button
					title="Transcribe"
					onPress={() => insertTemplate("transcribe")}
				/>
				<Button title="Summary" onPress={() => insertTemplate("summary")} />
				<Button title="Analysis" onPress={() => insertTemplate("analysis")} />
			</View>

			<Text style={styles.label}>Your Prompt</Text>
			<TextInput
				multiline
				numberOfLines={6}
				style={styles.textArea}
				value={prompt}
				onChangeText={setPrompt}
				placeholder="Your prompt will appear here..."
			/>

			<TouchableOpacity
				style={styles.submitBtn}
				onPress={handleSubmit}
				disabled={isLoading}
			>
				<Text style={styles.submitText}>
					{isLoading ? "Loading..." : "Submit Prompt"}
				</Text>
			</TouchableOpacity>

			<View style={styles.outputContainer}>
				<Text style={styles.outputLabel}>Output</Text>
				<TouchableOpacity onPress={handleCopy}>
					<Text style={styles.copyText}>Copy</Text>
				</TouchableOpacity>
			</View>

			<Text style={styles.outputText}>{output}</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		marginTop: Platform.OS === "web" ? 30 : 0,
		backgroundColor: "#f3f4f6",
	},
	heading: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: 6,
	},
	subtext: {
		fontSize: 14,
		marginBottom: 20,
		color: "#4B5563",
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginTop: 12,
		marginBottom: 6,
	},
	input: {
		backgroundColor: "white",
		borderColor: "#d1d5db",
		borderWidth: 1,
		padding: 10,
		borderRadius: 8,
	},
	fileBtn: {
		backgroundColor: "#e5e7eb",
		padding: 10,
		borderRadius: 6,
		marginTop: 12,
		alignItems: "center",
	},
	fileBtnText: {
		color: "#1f2937",
		fontWeight: "600",
	},
	fileName: {
		fontSize: 12,
		color: "#10b981",
		marginTop: 4,
	},
	taskButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 12,
	},
	textArea: {
		backgroundColor: "white",
		borderColor: "#d1d5db",
		borderWidth: 1,
		padding: 10,
		borderRadius: 8,
		height: 120,
		textAlignVertical: "top",
	},
	submitBtn: {
		backgroundColor: "#4f46e5",
		padding: 14,
		borderRadius: 8,
		marginTop: 16,
		alignItems: "center",
	},
	submitText: {
		color: "white",
		fontWeight: "700",
	},
	outputContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 24,
		marginBottom: 10,
	},
	outputLabel: {
		fontSize: 18,
		fontWeight: "600",
	},
	copyText: {
		fontSize: 14,
		color: "#6b7280",
		textDecorationLine: "underline",
	},
	outputText: {
		backgroundColor: "#f9fafb",
		padding: 12,
		borderRadius: 8,
		borderColor: "#e5e7eb",
		borderWidth: 1,
		color: "#374151",
		minHeight: 100,
	},
});
