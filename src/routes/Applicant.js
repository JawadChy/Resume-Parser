import React, { useState } from "react";
import { storage } from "../firebase"; // Import the Firebase storage module
import { ref, uploadBytes } from "firebase/storage"; // Import the Firebase storage functions
import { Link } from "react-router-dom"; // Import the React Router Link component
import { AiFillHome } from 'react-icons/ai'; // Import the home icon from React Icons
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry"; // Import the PDF.js worker
import * as pdfjsLib from "pdfjs-dist/build/pdf"; // Import the PDF.js library
import "./App.css";

// Initialize PDF.js with the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function Applicant() {
  const [fileUpload, setFileUpload] = useState(null); // State variable to store the file being uploaded

  const uploadFile = () => {
    // Upload the selected file to Firebase storage
    if (fileUpload == null) return;

    const file = fileUpload.name.split(".");
    
    if (!file.pop()) {
      console.error("Invalid file type");
      return;
    }

    const path = `${file.join(".") + crypto.randomUUID()}`;

    const fileRef = ref(storage, `pdf/${path}.pdf`);

    uploadBytes(fileRef, fileUpload)
      .then(() => {
        parsePDF(fileUpload, path); // Parse the uploaded PDF file
        alert("File Uploaded");
      })
      .catch((error) => {
        console.log("Upload Error:", error);
      });
  };

  // Function to clean parsed contents string so there isn't special
  const cleanString = (str) => {
    // Remove special characters except for +, #, @, ., and -
    const cleanedStr = str.replace(/[^\w\s+#@.-]/gi, "");
  
    // Remove duplicate spaces
    return cleanedStr.replace(/\s+/g, " ");
  };

  const parsePDF = (file, path) => {
    // Parse the uploaded PDF file using PDF.js
    const fileReader = new FileReader();
    fileReader.onload = function () {
      const typedArray = new Uint8Array(this.result);
      const loadingTask = pdfjsLib.getDocument(typedArray);
      loadingTask.promise.then(function (pdf) {
        const numPages = pdf.numPages;
        const getPageText = (page) =>
          page.getTextContent().then(function (textContent) {
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ");
            return pageText;
          });

        const getPagePromises = Array.from(
          { length: numPages },
          (_, i) => i + 1
        ).map((pageNum) => pdf.getPage(pageNum).then(getPageText));

        Promise.all(getPagePromises)
          .then((pageTexts) => {
            const parsedText = pageTexts.join("\n");
            const cleanedText = cleanString(parsedText); // Clean up the parsed text
            storeParsedText(cleanedText, path); // Store the cleaned text as a text file
          })
          .catch((error) => {
            console.log("PDF Parsing Error:", error);
          });
      });
    };
    fileReader.readAsArrayBuffer(file);
  };

  const storeParsedText = (parsedText, path) => {
    // Store the parsed text as a text file in Firebase storage
    const textFileRef = ref(storage, `txt/${path}.txt`);
    const textFileBlob = new Blob([parsedText], { type: "text/plain" });

    uploadBytes(textFileRef, textFileBlob)
      .then(() => {
        console.log("Parsed text stored as text file");
      })
      .catch((error) => {
        console.log("Text File Upload Error:", error);
      });
  };

  return (
    <div className="container">
      <link href="https://fonts.googleapis.com/css2?family=Varela+Round&display=swap" rel="stylesheet" />
      <div className="row justify-content-between mb-3">
        <div className="col-2">
          <Link to="/">
            <AiFillHome size={32} />
          </Link>
        </div>
        <div className="col-6">
          <h1 className="text-center"> Applicant </h1>
        </div>
        <div className="col-2"></div>
      </div>
      <div className="row justify-content-center mb-3">
        <div className="col-6">
          <div className="input-group">
            <input
              type="file"
              className="form-control"
              onChange={(event) => {
                setFileUpload(event.target.files[0]);
              }}
            />
            <button
              className="btn btn-primary"
              onClick={uploadFile}
            >
              Upload File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Applicant;