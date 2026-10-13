const STORAGE_KEY = 'workshop-projects-v1';

const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#project-name');
const statusInput = document.querySelector('#project-status');
const projectList = document.querySelector('#project-list');
const emptyMessage = document.querySelector('#empty-message');
const formMessage = document.querySelector('#form-message');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');

let projects = [];
let editingId = null;
let storageReady = true;

function showMessage(message) {
  formMessage.textContent = message;
}

function isValidProjects(data) {
  return Array.isArray(data) && data.every(project =>
    project !== null &&
    typeof project === 'object' &&
    typeof project.id === 'string' &&
    project.id.length > 0 &&
    typeof project.name === 'string' &&
    typeof project.status === 'string'
  );
}

function loadProjects() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY);

    if (savedText === null) {
      projects = [];
      return;
    }

    const savedProjects = JSON.parse(savedText);

    if (!isValidProjects(savedProjects)) {
      storageReady = false;
      emptyMessage.textContent =
        'Saved projects could not be loaded because the stored data is invalid.';

      showMessage(
        'Saved data has been preserved. Changes are disabled until it is checked.'
      );
      return;
    }

    // Older saves used "Planning"; the form and API use "Planned".
    projects = savedProjects.map(project =>
      project.status === 'Planning' ? { ...project, status: 'Planned' } : project
    );
  } catch (error) {
    storageReady = false;
    emptyMessage.textContent =
      'Saved projects could not be loaded.';

    showMessage(
      'Storage could not be read. Existing saved data has not been overwritten.'
    );
  }
}

function saveProjects() {
  try {
    const projectsText = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, projectsText);
    showMessage('Changes saved in this browser.');
    return true;
  } catch (error) {
    showMessage(
      'Changes could not be saved to this browser. They may be lost when you refresh.'
    );
    return false;
  }
}

function renderProjects() {
  projectList.replaceChildren();
  emptyMessage.hidden = projects.length > 0;

  projects.forEach(project => {
    const item = document.createElement('li');

    const projectName = document.createElement('strong');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('span');
    projectStatus.textContent = ` — ${project.status} `;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.dataset.action = 'edit';
    editButton.dataset.projectId = project.id;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.projectId = project.id;

    item.append(projectName, projectStatus, editButton, deleteButton);
    projectList.appendChild(item);
  });
}

function resetEditMode() {
  editingId = null;
  form.reset();
  saveButton.textContent = 'Add Project';
  cancelButton.hidden = true;
  nameInput.focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();

  if (!storageReady) {
    showMessage(
      'Cannot change projects until the saved data issue is checked.'
    );
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    showMessage('Enter a project name.');
    nameInput.focus();
    return;
  }

  if (editingId !== null) {
    const project = projects.find(
      item => item.id === editingId
    );

    if (!project) {
      showMessage('The project being edited could not be found.');
      resetEditMode();
      return;
    }

    project.name = name;
    project.status = status;
  } else {
    projects.push({
      id: crypto.randomUUID(),
      name: name,
      status: status
    });
  }

  renderProjects();
  resetEditMode();
  saveProjects();
});

projectList.addEventListener('click', event => {
  const button = event.target.closest('button[data-project-id]');

  if (!button) {
    return;
  }

  if (!storageReady) {
    showMessage(
      'Cannot change projects until the saved data issue is checked.'
    );
    return;
  }

  const projectId = button.dataset.projectId;

  const project = projects.find(
    item => item.id === projectId
  );

  if (!project) {
    return;
  }

  if (button.dataset.action === 'edit') {
    editingId = project.id;
    nameInput.value = project.name;
    statusInput.value = project.status;

    saveButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    nameInput.focus();
    return;
  }

  if (button.dataset.action === 'delete') {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const index = projects.findIndex(
      item => item.id === projectId
    );

    if (index === -1) {
      return;
    }

    projects.splice(index, 1);

    if (editingId === projectId) {
      resetEditMode();
    }

    renderProjects();
    saveProjects();
  }
});

cancelButton.addEventListener('click', () => {
  resetEditMode();
});

loadProjects();
renderProjects();
