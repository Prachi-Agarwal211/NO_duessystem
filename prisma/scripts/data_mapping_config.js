/**
 * STRICT DATA MAPPING CONFIGURATION
 * Maps raw CSV values (loose text) to Database Config Names.
 */

module.exports = {
    /**
     * Map Raw CSV Course Name -> Config Course Name
     */
    courseNameMap: {
        // Engineering
        "Bachelor of Technology": "B.Tech",
        "Master of Technology": "M.Tech",
        "Diploma Engineering": "Diploma Engineering",

        // Computer Applications
        "Bachelor of Computer Applications": "BCA",
        "Bachelor of Computer Applications (Hons.)": "BCA",
        "Master of Computer Applications": "MCA",
        "Bachelor of Computer Applications (ODL Mode)": "BCA",

        // Business
        "Bachelor of Business Administration": "BBA",
        "Master of Business Administration": "MBA",
        "Bachelor of Commerce": "B.Com",
        "Master of Commerce": "M.Com",
        "Bachelor of Business Administration (ODL Mode)": "BBA",
        "Bachelor of Commerce (ODL Mode)": "B.Com",

        // Law
        "Bachelor of Arts with LLB (Hons.)": "BA LLB",
        "Bachelor of Business Administration with LLB (Hons.)": "BA LLB",
        "Bachelor of Commerce with LLB": "LLB",
        "Bachelor of Science with LLB (Hons.)": "BA LLB",
        "Master of Law": "LLM",
        "Bachelor of Law": "LLB",

        // Sciences
        "Bachelor of Science": "B.Sc.",
        "Bachelor of Science (Hons.)": "B.Sc.",
        "Bachelor of Science (Pass Course)": "B.Sc.",
        "Master of Science": "M.Sc",

        // Design
        "Bachelor of Design": "B.Des",
        "Bachelor of Design-Gurukul School of Design": "B.Des",
        "Master of Design": "M.Des",

        // Humanities
        "Bachelor of Arts": "B.A.",
        "Bachelor of Arts (Hons.)": "B.A.",
        "Master of Arts": "M.A.",

        // Mass Comm
        "Journalism and Mass Communication": "BJMC",
        "Bachelor of Arts (Journalism and Mass Communication)": "BJMC",

        // Hospitality
        "Bachelor of Hotel Management and Catering Technology": "BHM",
        "Hospitality and Hotel Management": "BHM",

        // Allied Health
        "Bachelor of Physiotherapy": "BPT",
        "Master of Physiotherapy": "BPT",
        "Bachelor of Medical Lab Technology": "B.Sc.",
        "Bachelor of Radiation Technology": "B.Sc.",
        "Clinical Embryology": "M.Sc",
        "Bachelor of Visual Arts": "Bachelor of Visual Arts",
        "Medical Lab Technology": "B.Sc.",
        "Radiology and Imaging Techniques": "B.Sc.",
        "Radiation Technology": "B.Sc.", // Mapped to B.Sc.

        // Research
        "Doctor of Philosophy": "Ph.D.",
        "Ph.D.": "Ph.D.",

        // Others
        "Certificate Course": "Certificate Programs",
    },

    /**
     * Map Raw CSV Branch Name -> Config Branch Name
     */
    branchNameMap: {
        // Engineering - SAMATRIX / AI-ML
        "Computer Science and Engineering (Data Science and Data Analytics)-Samatrix": "CSE Data Science Samatrix",
        "Computer Science and Engineering (Artificial Intelligence and Machine Learning)-Samatrix": "CSE AI/ML Samatrix",
        "CSE (Artificial Intelligence and Data Science)": "CSE AI/ML Samatrix",
        "Computer Science and Engineering (Artificial Intelligence)": "CSE Artificial Intelligence",

        // Engineering - IBM
        "Computer Science and Engineering (Artificial Intelligence and Machine Learning)-IBM": "CSE AI/ML IBM",
        "Computer Science and Engineering (Big Data and Data Analytics)-IBM": "CSE Big Data & Analytics - IBM",
        "Computer Science and Engineering (Cloud Computing)-IBM": "Computer Science & Engineering - IBM Cloud Computing",

        // Engineering - AWS
        "Computer Science and Engineering (Cloud Computing)-Amazon AWS": "CSE Cloud Computing - AWS",

        // Engineering - Xebia
        "Computer Science and Engineering (DevOps Automation and Cloud Computing)-Xebia": "CSE AI/ML Xebia",
        "Computer Science and Engineering (Full Stack Web Design and Development)-Xebia": "CSE Fullstack - Xebia",
        "Computer Science and Engineering (Artificial Intelligence and Machine Learning)-Xebia": "CSE AI/ML Xebia",

        // Engineering - Microsoft
        "Computer Science and Engineering (Cloud Computing)-Microsoft": "CSE Cloud Computing - Microsoft",

        // Engineering - TCS
        "Computer Science and Engineering (Computer Science and Business System)-TCS": "CSE - CSBS - TCS",

        // Engineering - L&T
        "Computer Science and Engineering (Generative AI)-L and T EduTech": "CSE Generative AI - L&T",
        "Computer Science and Engineering (Industry Integrated)-L and T EduTech": "Computer Science & Engineering - L&T EduTech",
        "Electronics and Communication Engineering (Industry Integrated)-L and T EduTech": "Artificial Intelligence & Machine Learning - L&T EduTech",

        // Engineering - Kalvium
        "Computer Science and Engineering (Software Product Engineering)-Kalvium": "CSE Software Product Engg - Kalvium",

        // Engineering - UPGRAD
        "Computer Science and Engineering (Block Chain)-upGrad Campus": "CSE Blockchain - upGrad",

        // Engineering - EC Council
        "Computer Science and Engineering (Cyber Security)-EC Council USA": "CSE Cyber Security - EC Council",

        // Generic Engineering
        "Computer Science and Engineering": "Computer Science & Engineering",
        "Civil Engineering": "Civil Engineering",
        "Mechanical Engineering": "Mechanical Engineering",
        "Electrical Engineering": "Electrical Engineering",
        "Electronics and Communication Engineering": "Electronics & Communication Engineering",
        "Information Technology": "Information Technology",
        "Chemical Engineering": "Chemical Engineering",
        "Biotechnology": "Biotechnology",
        "Automobile Engineering": "Automobile Engineering",

        // M.Tech
        "Civil Engineering (Construction Engineering and Management)": "Civil Engineering (Construction Engineering and Management)",
        "Civil Engineering (Transportation Engineering)": "Civil Engineering (Transportation Engineering)",
        "Civil Engineering (Environmental Engineering)": "Civil Engineering (Environmental Engineering)",
        "Mechanical Engineering (Production Engineering)": "Mechanical Engineering (Production Engineering)",

        // BCA/MCA
        "BCA": "Computer Applications",
        "BCA (ArtificiaI Intelligence and Data Science)": "Computer Applications - Samatrix AI & ML",
        "BCA (ArtificiaI Intelligence and Machine Learning)-IBM": "Computer Applications - Samatrix AI & ML",
        "BCA (Cloud Computing and Full Stack Development)-IBM": "Computer Applications - Samatrix Cloud Computing",
        "BCA (Cyber Security)-EC Council USA": "Computer Applications - EC-Council Cyber Security",
        "BCA (Data Science and Data Analytics)-Samatrix": "Computer Applications - Samatrix Data Science",
        "BCA (Full Stack Web Design and Development)-Xebia": "Computer Applications - Xebia Software Engineering",
        "BCA (Cloud Computing)-Amazon AWS": "Computer Applications - Samatrix Cloud Computing",
        "BCA (Robot Process Automation)-CollegeDekho": "BCA CollegeDekho",
        "BCA-Sunstone": "BCA Sunstone",
        "BCA (Block Chain)-upGrad Campus": "BCA (Block Chain)-upGrad Campus",
        "BCA (Full Stack)-CollegeDekho": "BCA (Full Stack)-CollegeDekho",
        "BCA-CollegeDekho": "BCA-CollegeDekho",
        "BCA (Cloud Computing)-Microsoft": "BCA (Cloud Computing)-Microsoft",
        "BCA (Digital Forensics and Information Security)-CollegeDekho": "BCA (Digital Forensics and Information Security)-CollegeDekho",
        "BCA (Robotic Process Automation)-CollegeDekho": "BCA (Robotic Process Automation)-CollegeDekho",
        "BCA (Health Informatics)": "BCA (Health Informatics)",

        "MCA-Sunstone": "MCA Sunstone",
        "MCA (Cyber Security)-EC Council USA": "Computer Applications - EC-Council Cyber Security",
        "MCA (ArtificiaI Intelligence and Machine Learning)-Samatrix": "Computer Applications - Samatrix AI & ML",
        "MCA (Data Science and Data Analytics)-Samatrix": "Computer Applications - Samatrix Data Science",
        "MCA (Cloud Computing and Full Stack Development)-IBM": "Computer Applications - Samatrix Cloud Computing",
        "Master of Computer Applications": "Computer Applications",
        "MCA (Artificial Intelligence and Data Science)": "MCA AI & DS",
        "MCA (Cloud Computing)-Amazon AWS": "MCA Cloud Computing - AWS",
        "MCA (Full Stack)-CollegeDekho": "MCA (Full Stack)-CollegeDekho",

        // BBA/MBA
        "BBA": "General Management",
        "BBA (Banking Financial Service and Insurance)": "Banking & Financial Services",
        "BBA-Sunstone": "BBA - Sunstone",
        "MBA-Sunstone": "MBA - Sunstone",
        "BBA (Data Analytics and Data Visualization)-Samatrix": "Business Analytics",
        "BBA - ISDC": "BBA - ISDC",
        "BBA (Digital Business Analytics (IoA))-ISDC": "Business Analytics",

        "BBA (Financial Markets (IFM))-ISDC": "BBA (Financial Markets (IFM))-ISDC",
        "BBA (New Age Sales and Marketing)-CollegeDekho": "BBA (New Age Sales and Marketing)-CollegeDekho",
        "BBA (Fintech)-Zell Education And Deloitte": "BBA (Fintech)-Zell Education And Deloitte",
        "BBA (Brand Management)-CollegeDekho": "BBA (Brand Management)-CollegeDekho",
        "BBA (Digital Business(AISI))-ISDC": "BBA (Digital Business(AISI))-ISDC",
        "BBA (Logistics and Supply Chain Management (CIPS))-ISDC": "BBA (Logistics and Supply Chain Management (CIPS))-ISDC",
        "BBA (Global Business)-ISDC": "BBA (Global Business)-ISDC",
        "BBA (Tourism and Hospitality Management)": "BBA (Tourism and Hospitality Management)",
        "BBA-CollegeDekho": "BBA-CollegeDekho",


        "MBA (Fintech)-Imarticus": "MBA (Fintech)-Imarticus",
        "MBA (New Age SM GFO AHR)-CollegeDekho": "MBA (New Age SM GFO AHR)-CollegeDekho",
        "MBA (Data Analytics and Data Visualization)-Samatrix": "MBA Data Analytics Samatrix",
        "MBA-CollegeDekho": "MBA - CollegeDekho",


        "Marketing": "Marketing",
        "Finance": "Finance",
        "Human Resource": "Human Resource Management",
        "Operations": "Operations Management",
        "Hospitality and Hotel Management": "Hotel Management",

        // Mass Comm
        "Journalism and Mass Communication": "Journalism & Mass Communication",

        // Allied Health
        "BPT": "Physiotherapy",
        "Bachelor of Physiotherapy": "Physiotherapy",
        "Medical Lab Technology": "Medical Lab Technology",
        "Radiology and Imaging Techniques": "Radiology and Imaging Techniques",
        "Radiation Technology": "Radiation Technology",
        "Clinical Embryology": "Clinical Embryology",

        // Arts & Design
        "BVA (Graphic Design)": "Graphic Design",
        "Bachelor of Visual Arts": "Bachelor of Visual Arts",
        "Fashion Design": "Fashion Design",
        "Interior Design": "Interior Design",
        "Jewellery Design": "Jewellery Design",
        "Graphic Design": "Graphic Design",
        "Product Design": "Product Design",
        "Visual Communication": "Visual Communication",
        "B. Des (Interior Design)": "Interior Design",
        "B. Des (Fashion Design)": "Fashion Design",
        "B. Des (Jewellery Design and Manufacturing)": "Jewellery Design",
        "B. Des": "Fashion Design",
        "B.Des (Communication Design)-ISDC": "B.Des (Communication Design)-ISDC",
        "Bachelor of Design-Gurukul School of Design": "Bachelor of Design-Gurukul School of Design",

        // Commerce (B.Com)
        "B. Com": "Accounting & Finance",
        "Bachelor of Commerce": "Accounting & Finance",
        "B. Com (Hons.)": "Accounting & Finance",
        "B. Com (International Finance and Accounting-ACCA)-ISDC": "International Business - ISDC Program",
        "B. Com (Finance and Analytics-IoA)-ISDC": "B. Com (Finance and Analytics-IoA)-ISDC",

        // Law
        "BA LLB (Hons.)": "General Law",
        "BBA LLB (Hons.)": "General Law",
        "B. Sc LLB (Hons.)": "General Law",
        "B. Com LLB": "General Law",
        "Bachelor of Law": "General Law",
        "LLM": "General Law",
        "LLM (Business Law)": "LLM (Business Law)",

        // Hospitality
        "BHMCT": "BHMCT",
        "Bachelor of Hotel Management and Catering Technology": "BHMCT",

        // Liberal Arts
        "Liberal Studies with Major (International Relations & Diplomacy)": "Liberal Studies with Major (International Relations & Diplomacy)",

        // Sciences
        "Physics": "Physics",
        "Chemistry": "Chemistry",
        "Mathematics": "Mathematics",
        "Botany": "Botany",
        "Zoology": "Zoology",
        "Microbiology": "Microbiology",
        "Biotechnology": "Biotechnology",
        "Forensic Science": "Forensic Science",
        "B. Sc (Pass Course)": "Pass Course",
        "Bachelor of Science": "Pass Course",
        "Bachelor of Science (Pass Course)": "Pass Course",
        "B.Sc.": "Pass Course",
        "Bachelor of Science (Hons.)": "Pass Course",
    },

    normalize: (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
};
