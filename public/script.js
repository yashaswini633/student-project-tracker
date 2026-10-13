async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new Error('Could not reach the server.');
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Unexpected server response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

const store = {
  list: () => request('/api/projects'),
  create: project => request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  }),
  update: (id, project) => request(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  }),
  remove: id => request(`/api/projects/${id}`, { method: 'DELETE' })
};

const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#project-name');
const statusInput = document.querySelector('#project-status');
const projectList = document.querySelector('#project-list');
const emptyMessage = document.querySelector('#empty-message');
const formMessage = document.querySelector('#form-message');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const emptyText = emptyMessage.textContent;

let projects = [];
let editingId = null;
let busy = false;

function showMessage(message) {
  formMessage.textContent = message;
}

function showError(error) {
  showMessage(`${error.message} Check that the server is running.`);
}

function setBusy(value) {
  busy = value;
  form.querySelectorAll('input, select, button').forEach(element => {
    element.disabled = value;
  });
  projectList.querySelectorAll('button').forEach(element => {
    element.disabled = value;
  });
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

async function refreshProjects() {
  projects = await store.list();
  emptyMessage.textContent = emptyText;
  renderProjects();
}

function resetEditMode() {
  editingId = null;
  form.reset();
  saveButton.textContent = 'Add Project';
  cancelButton.hidden = true;
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (busy) {
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    showMessage('Enter a project name.');
    nameInput.focus();
    return;
  }

  setBusy(true);
  showMessage('Saving...');

  try {
    if (editingId !== null) {
      await store.update(editingId, { name, status });
    } else {
      await store.create({ name, status });
    }

    resetEditMode();
    await refreshProjects();
    showMessage('Project saved on the server.');
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    nameInput.focus();
  }
});

projectList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-project-id]');

  if (!button || busy) {
    return;
  }

  // The server uses numeric ids; data attributes are always text.
  const projectId = Number(button.dataset.projectId);

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

    setBusy(true);
    showMessage('Deleting...');

    try {
      await store.remove(projectId);

      if (editingId === projectId) {
        resetEditMode();
      }

      await refreshProjects();
      showMessage('Project deleted.');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
});

cancelButton.addEventListener('click', () => {
  resetEditMode();
  nameInput.focus();
});

setBusy(true);
showMessage('Loading projects...');
refreshProjects()
  .then(() => showMessage(''))
  .catch(error => {
    // A failed load is not the same as an empty list.
    emptyMessage.textContent = 'Projects could not be loaded.';
    showError(error);
  })
  .finally(() => setBusy(false));
