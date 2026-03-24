(function () {
  const COMPANIES = [
    "Infosys",
    "TCS",
    "Wipro",
    "Accenture",
    "Capgemini",
    "Cognizant",
    "IBM India",
    "Oracle India",
    "SAP Labs India",
    "Dell Technologies",
    "Amazon India",
    "Flipkart",
    "Swiggy",
    "Razorpay",
    "PhonePe",
    "Paytm",
    "Zoho Corporation",
    "Freshworks",
    "Juspay",
    "CRED",
    "Slice",
    "Groww",
    "Meesho",
    "Lenskart",
    "Nykaa",
    "Mindtree",
    "LTIMindtree",
    "HCLTech",
    "Tech Mahindra",
    "Mphasis",
    "Darwinbox",
    "Postman",
    "Plivo",
    "Vymo",
  ];

  const TITLES = [
    "SDE Intern",
    "Graduate Engineer Trainee",
    "Junior Backend Developer",
    "Frontend Intern",
    "QA Intern",
    "Data Analyst Intern",
    "Java Developer (0-1)",
    "Python Developer (Fresher)",
    "React Developer (1-3)",
  ];

  const LOCATIONS = [
    "Bengaluru",
    "Hyderabad",
    "Pune",
    "Chennai",
    "Mumbai",
    "Gurugram",
    "Noida",
    "Kolkata",
    "Ahmedabad",
    "Kochi",
    "Indore",
    "Remote — India",
  ];

  const MODES = ["Remote", "Hybrid", "Onsite"];
  const EXPERIENCES = ["Fresher", "0-1", "1-3", "3-5"];
  const SOURCES = ["Linkedin", "Naukri", "Indeed"];
  const SALARIES = ["3-5 LPA", "6-10 LPA", "10-18 LPA", "₹15k-40k/month Internship"];

  const SKILL_POOLS = [
    ["Java", "Spring Boot", "REST APIs"],
    ["Python", "Django", "PostgreSQL"],
    ["React", "TypeScript", "CSS"],
    ["Node.js", "Express", "MongoDB"],
    ["SQL", "Excel", "Python"],
    ["Selenium", "Java", "CI fundamentals"],
    ["Angular", "RxJS", "Jest"],
    ["Go", "gRPC", "Docker"],
    ["Kotlin", "Android", "JUnit"],
    ["AWS", "Linux", "Terraform"],
    ["C++", "Data structures", "Git"],
    ["JavaScript", "Vue.js", "Vite"],
  ];

  const EXTRA_LINES = [
    "Your manager will set weekly goals and unblock dependencies early.",
    "The team runs two-week sprints with visible release notes.",
    "Security reviews and access controls follow standard enterprise practice.",
    "Pairing sessions are common during the first month.",
    "You may rotate across squads after the probation window.",
    "Code ownership is explicit; on-call expectations are documented.",
  ];

  function buildDescription(company, title, location, mode, index) {
    const lines = [
      `${company} is hiring a ${title} for work anchored in ${location}, with a ${mode.toLowerCase()} collaboration model.`,
      `Day-to-day work includes designing small features, fixing defects, and improving test coverage alongside tenured engineers.`,
      `You will join stand-ups, refine backlog items, and present short demos when features reach staging.`,
      `We expect clear written updates, respectful code review feedback, and careful handling of production data boundaries.`,
      EXTRA_LINES[index % EXTRA_LINES.length],
    ];
    if (index % 3 === 0) {
      lines.push(
        "Interview rounds typically cover problem solving, system basics for the stack, and a short culture conversation."
      );
    }
    return lines.join("\n");
  }

  const jobs = [];

  for (let i = 0; i < 60; i += 1) {
    const id = `job-${String(i + 1).padStart(3, "0")}`;
    const company = COMPANIES[i % COMPANIES.length];
    const title = TITLES[(i + Math.floor(i / 4)) % TITLES.length];
    const location = LOCATIONS[(i * 3 + 5) % LOCATIONS.length];
    const mode = MODES[(i + title.length) % MODES.length];
    const experience = EXPERIENCES[(i + company.length) % EXPERIENCES.length];
    const skills = [...SKILL_POOLS[(i + mode.length) % SKILL_POOLS.length]];
    const source = SOURCES[i % SOURCES.length];
    const postedDaysAgo = (i * 3 + 7) % 11;
    const salaryRange = SALARIES[(i + postedDaysAgo) % SALARIES.length];
    const liId = 872450000 + i * 137;
    const applyUrl =
      source === "Linkedin"
        ? `https://www.linkedin.com/jobs/view/${liId}`
        : source === "Naukri"
          ? `https://www.naukri.com/job-listings-${id}-${encodeURIComponent(title.replace(/\s+/g, "-").toLowerCase())}`
          : `https://in.indeed.com/viewjob?jk=${(872000000 + i).toString(16)}`;

    jobs.push({
      id,
      title,
      company,
      location,
      mode,
      experience,
      skills,
      source,
      postedDaysAgo,
      salaryRange,
      applyUrl,
      description: buildDescription(company, title, location, mode, i),
    });
  }

  window.JOBS = jobs;
})();
