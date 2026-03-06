const usuarios = {
    "Diego": "1234",
    "Fernando": "5678",
    "Esdras": "4321"
};

function llenarPin(){
    const nombre = document.getElementById("usuarios").value;
    const inputs = document.querySelectorAll(".pin input");

    inputs.forEach(i => i.value = "");

    if(usuarios[nombre]){
        const pin = usuarios[nombre];

        for(let i = 0; i < 4; i++){
            inputs[i].value = pin[i];
        }
    }
}

function login(){
    const nombre = document.getElementById("usuarios").value;
    const inputs = document.querySelectorAll(".pin input");

    let pinIngresado = "";
    inputs.forEach(i => pinIngresado += i.value);

    if(nombre === ""){
        alert("Selecciona un usuario");
        return;
    }

    if(pinIngresado === usuarios[nombre]){
        window.location.href = "dashboard.html";
    } else {
        alert("PIN incorrecto");
    }
}