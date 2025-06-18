# **App Name**: CodeCraft Estimator

## Core Features:

- AI-Powered Requirements Generation: Generates a software requirement document based on user input, incorporating best practices for functional and non-functional requirements, security, and deployment. The LLM powering this tool uses reasoning to decide which details to incorporate, and which to leave out, depending on the prompt received.
- Module Management: Allows users to create, name, and organize individual project modules to organize the estimation process.
- Manual Task Entry: Enables manual entry of tasks within each module, including optimistic, pessimistic and most likely time estimates. All time estimates are stored as Decimal types, and can be input in minutes, hours or days.
- Automated Time Calculation: Calculates the weighted average time for each task using the formula: (pessimistic + 4 * most likely + optimistic) / 6. Displays this estimate on screen.
- Risk and Complexity Adjustments: Provides a section to input potential project risks (with associated time estimate) as well as an overall effort multiplier for considerations like security or deployment complexity.
- Time to Cost Conversion: Dynamically converts the total estimated time to a project cost based on a user-definable hourly rate.  Changes reactively when any of the time estimates are adjusted.
- AI-Powered Task Augmentation: Allows the user to input a prompt to add more tasks to the current module and adjust task times. The LLM powering this tool uses reasoning to decide if task suggestions can improve project delivery.

## Style Guidelines:

- Primary color: Deep Indigo (#4B0082) for conveying expertise and planning.
- Background color: Light Grayish-Blue (#E6E8EB) for a neutral, professional backdrop.
- Accent color: Vibrant Yellow-Orange (#FFA500) to highlight key metrics and interactive elements.
- Font pairing: 'Space Grotesk' (sans-serif) for headings and 'Inter' (sans-serif) for body text, to create a balance of technical precision and readability.
- Use a set of consistent, outline-style icons that represent different modules, tasks, and stages of development.
- Implement a clear, tab-based interface for managing modules, tasks, and overall project settings, with an intuitive visual hierarchy.
- Incorporate subtle, smooth transitions for task additions, updates, and recalculations, to visually reinforce the dynamic nature of the estimator.