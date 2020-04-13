let timer = null;

const URL_PLAYER = "https://player.twitch.tv/?muted=true&channel";
const URL_TWICH_API = "https://api.twitch.tv/helix/streams";
const UPDATE_TIME = 7000;

const store = {
  ids: {
    token: {
      value: "",
      default: "kimne78kx3ncx6brgo4mv6wki5h1ko"
    },
    game_id: {
      value: "",
      default: "500188"
    },
    langs: {
      value: "",
      default: "ru"
    },
    first: {
      value: "",
      default: "10"
    }
  },
  lists: {
    favorite: [],
    block: []
  },
  streams: []
};

window.onload = () => {
  document.querySelector("#sidebar-toggle").addEventListener("click", e => {
    document.querySelector(".sidebar").classList.toggle("hide");
  });

  loadSettings();

  renderBlockList();

  updateToggle();

  document.querySelector("#update-toggle").addEventListener("click", updateToggle);
  document
    .querySelector("#token")
    .addEventListener("change", e => updateStore(e.target.id, e.target.value));
  document
    .querySelector("#game_id")
    .addEventListener("input", e => updateStore(e.target.id, e.target.value));
  document
    .querySelector("#langs")
    .addEventListener("input", e => updateStore(e.target.id, e.target.value));
  document
    .querySelector("#first")
    .addEventListener("input", e => updateStore(e.target.id, e.target.value));
};

function updateStore(id, value) {
  store.ids[id].value = value;
  saveSettings();
}

function loadSettings() {
  const { ids, lists } = store;

  Object.keys(ids).forEach(id => {
    const value = localStorage.getItem(id) || ids[id].default;
    document.querySelector(`#${id}`).value = value;
    ids[id].value = value;
  });

  Object.keys(lists).forEach(list => {
    const arr = JSON.parse(localStorage.getItem(list)) || [];
    lists[list] = arr;
  });
}

function saveSettings() {
  const { ids, lists } = store;

  Object.keys(ids).forEach(id => {
    localStorage.setItem(id, document.querySelector(`#${id}`).value)
  });

  Object.keys(lists).forEach(list => {
    localStorage.setItem(list, JSON.stringify(lists[list]));
  });
}

function templateListItem(username) {
  return `
    <li class="list--item">
      <a 
        href="${URL_PLAYER}=${username}" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        ${username}
      </a>
      <button class="mini-button" id="${username}_unblock">X</button>
    </li>
  `;
}

function templateStream(i) {
  return `
    <div class="stream-menu">
      <span class="stream-title">
        <a
          class="stream-user"
          target="_blank"
          href="${URL_PLAYER}=${i.user_name}"
        >
          ${i.user_name}
        </a>
        - ${i.title}
      </span>
      <div class="stream-menu-buttons" data-username="${i.user_name}">
        <button class="mini-button stream-favorite">F</button>
        <button class="mini-button stream-block">B</button>
        <button class="mini-button stream-close">X</button>
      </div>
    </div>
    <iframe
      class="stream-iframe"
      frameborder="0"
      allowfullscreen="true"
      src="${URL_PLAYER}=${i.user_name}"
    ></iframe>
  `;
}

function renderBlockList() {
  const { lists } = store;
  document.querySelector(`#block-list`).innerHTML = "";

  // add
  lists.block.forEach(i => {
    document.querySelector(`#block-list`).innerHTML += templateListItem(i);
  });

  // events
  lists.block.forEach(i => {
    document.querySelector(`#${i}_unblock`).addEventListener("click", e => {
      unBlockStream(i);
    });
  });
}

function renderStreams(streams) {
  const APP = document.querySelector("#app");
  const {favorite, block} = store.lists;
  // add
  streams.forEach(stream => {
    if (favorite.some(v => v === stream.user_name)) stream.favorite = true;
    if (!block.some(v => v === stream.user_name)) {
      const el = document.createElement("div");
      el.innerHTML = templateStream(stream);
      el.id = stream.user_name;
      el.className = `stream ${stream.favorite ? "favorite" : ""}`;

      // events
      el.querySelector(`#${stream.user_name} .stream-close`).addEventListener("click", e => {
        const user_name = e.target.offsetParent.id;
        delStreams([{ user_name }]);
      });

      el.querySelector(`#${stream.user_name} .stream-favorite`).addEventListener("click", e => {
        const user_name = e.target.offsetParent.id;
        favoriteStream(user_name);
      });

      el.querySelector(`#${stream.user_name} .stream-block`).addEventListener("click", e => {
        const user_name = e.target.offsetParent.id;
        blockStream(user_name);
        delStreams([{ user_name }]);
      });

      store.streams.push(stream);

      APP.append(el);
    }
  });
}

function addStreams(streams) {
  renderStreams(streams);
}

function delStreams(streams) {
  streams.forEach(stream => {
    store.streams.splice(
      store.streams.findIndex(v => v.user_name === stream.user_name),
      1
    );
  });
  removeStreams(streams);
}

function removeStreams(streams) {
  streams.forEach(stream => {
    document.querySelector(`#${stream.user_name}`).remove();
  });
}

function blockStream(username) {
  store.lists.block.push(username);
  renderBlockList();
  saveSettings();
}

function unBlockStream(username) {
  store.lists.block.splice(
    store.lists.block.findIndex(v => v === username),
    1
  );
  renderBlockList();
  saveSettings();
}

function favoriteStream(username) {
  if (store.lists.favorite.findIndex(v => v === username) === -1) {
    store.lists.favorite.push(username);
  } else {
    unFavoriteStream(username);
  }
  document.querySelector(`#${username}`).classList.toggle("favorite");
  saveSettings();
}

function unFavoriteStream(username) {
  store.lists.favorite.splice(
    store.lists.favorite.findIndex(v => v === username),
    1
  );
}

async function getStreamList(token, ids, langs, first) {
  const strIds = ids.split(';').reduce((acc,id)=> acc+=`&game_id=${id}`,'');
  const strLangs = langs.split(';').reduce((acc,id)=> acc+=`&game_id=${id}`,'');
  const params = `?first=${first}${strIds}${strLangs}`;

  const response = await fetch(`${URL_TWICH_API}${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Client-ID": token
    }
  });

  if (response.ok) {
    return response.json();
  } else {
    alert("API ERROR");
  }
}

function diffListStreams(oldListStreams, listStreams) {
  const newListStreams = listStreams.data;

  const result = {
    add: [],
    del: []
  };

  if (newListStreams !== undefined) {
    oldListStreams.forEach(oldStream => {
      if (!newListStreams.some(newStream => oldStream.user_name === newStream.user_name)) {
        result.del.push(oldStream);
      }
    });

    newListStreams.forEach(newStream => {
      if (!oldListStreams.some(oldStream => oldStream.user_name === newStream.user_name)) {
        result.add.push(newStream);
      }
    });
  }
  // console.log("update", result);
  // console.log("store", store);
  return result;
}

function updateToggle() {
  const start = document.querySelector("#update-toggle");
  if (start.innerText === "STOP UPDATE") {
    clearTimeout(timer);
    start.innerText = "START UPDATE";
  } else {
    update();
    timer = setInterval(update, UPDATE_TIME);
    start.innerText = "STOP UPDATE";
  }
}

async function update() {
  const { token, game_id, langs, first } = store.ids;
  const { streams } = store;

  const newStreams = await getStreamList(token.value, game_id.value, langs.value, first.value);

  const listStreams = diffListStreams(streams, newStreams);

  if (!(!listStreams.del & !listStreams.add)) {
    delStreams(listStreams.del);
    addStreams(listStreams.add);
  }

  saveSettings();
}
